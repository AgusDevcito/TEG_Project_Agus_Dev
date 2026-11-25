import type {
  ActionResult,
  ContinentId,
  GameLogEntry,
  GameState,
  Player,
  PlayerConfig,
  RngFn,
  TerritoryCard,
  TerritoryState,
} from '../../types/game.ts';
import {
  canClaimTerritoryCardBonus,
  createCountryDeck,
  getTradeArmiesReward,
  isValidCardTrade,
  shuffle,
} from '../cards/cards.ts';
import { checkVictoryForPlayer, SECRET_OBJECTIVES } from '../cards/objectives.ts';
import { resolveCombat } from '../combat/combat.ts';
import {
  areNeighbors,
  getPlayerTerritoryCount,
  getTerritoryDefinition,
  TERRITORIES,
} from '../territories/mapData.ts';
import { calculateReinforcements } from '../turns/reinforcements.ts';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const INITIAL_PLACEMENT_ROUND_1_ARMIES = 5;
export const INITIAL_PLACEMENT_ROUND_2_ARMIES = 3;

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function getTotalPendingArmies(player: Player): number {
  const continentTotal = Object.values(player.pendingContinentArmies).reduce(
    (sum, n) => sum + (n ?? 0),
    0,
  );
  return player.pendingArmies + continentTotal;
}

function appendLog(
  state: GameState,
  message: string,
): GameLogEntry[] {
  const nextId = state.log.length > 0 ? state.log[state.log.length - 1].id + 1 : 1;
  return [
    ...state.log,
    {
      id: nextId,
      round: state.round,
      phase: state.phase,
      message,
    },
  ];
}

function fail(state: GameState, error: string): ActionResult {
  return { ok: false, state, error };
}

function getNextAlivePlayerIndex(players: readonly Player[], fromIndex: number): number {
  const total = players.length;
  for (let offset = 1; offset <= total; offset += 1) {
    const idx = (fromIndex + offset) % total;
    if (!players[idx].eliminated) {
      return idx;
    }
  }
  return fromIndex;
}

function checkAnyVictory(state: GameState): GameState {
  for (const player of state.players) {
    const reason = checkVictoryForPlayer(player, state);
    if (reason) {
      return {
        ...state,
        phase: 'game_over',
        winnerId: player.id,
        winReason: reason,
        log: appendLog(
          state,
          `¡${player.name} ganó la partida (${reason})!`,
        ),
      };
    }
  }
  return state;
}

/**
 * Crea el estado inicial de una partida de TEG (2 a 6 jugadores):
 * - Reparte los 50 países equitativamente con 1 ejército cada uno.
 * - Asigna un objetivo secreto aleatorio a cada jugador.
 * - Inicia en la ronda 1 de incorporación inicial (5 ejércitos por jugador).
 */
export function createInitialGameState(
  playerConfigs: readonly PlayerConfig[],
  rng: RngFn = Math.random,
): GameState {
  if (playerConfigs.length < MIN_PLAYERS || playerConfigs.length > MAX_PLAYERS) {
    throw new Error(
      `El TEG requiere entre ${MIN_PLAYERS} y ${MAX_PLAYERS} jugadores.`,
    );
  }

  const seenIds = new Set<string>();
  const seenColors = new Set<string>();
  for (const cfg of playerConfigs) {
    if (seenIds.has(cfg.id)) {
      throw new Error(`ID de jugador duplicado: ${cfg.id}`);
    }
    if (seenColors.has(cfg.color)) {
      throw new Error(`Color de jugador duplicado: ${cfg.color}`);
    }
    seenIds.add(cfg.id);
    seenColors.add(cfg.color);
  }

  const shuffledObjectives = shuffle(SECRET_OBJECTIVES, rng);
  const players: Player[] = playerConfigs.map((cfg, index) => ({
    id: cfg.id,
    name: cfg.name,
    color: cfg.color,
    isBot: cfg.isBot ?? false,
    eliminated: false,
    eliminatedBy: null,
    objectiveId: shuffledObjectives[index].id,
    cards: [],
    tradesCount: 0,
    pendingArmies: INITIAL_PLACEMENT_ROUND_1_ARMIES,
    pendingContinentArmies: {},
  }));

  const shuffledTerritories = shuffle(TERRITORIES, rng);
  const territories: Record<string, TerritoryState> = {};
  shuffledTerritories.forEach((territory, idx) => {
    const owner = players[idx % players.length];
    territories[territory.id] = {
      id: territory.id,
      ownerId: owner.id,
      armies: 1,
    };
  });

  const deck = createCountryDeck(rng);

  return {
    round: 1,
    phase: 'initial_placement_1',
    players,
    currentPlayerIndex: 0,
    territories,
    deck,
    discardPile: [],
    conqueredThisTurn: false,
    pendingConquest: null,
    regroupLockedArmies: {},
    lastCombat: null,
    winnerId: null,
    winReason: null,
    log: [
      {
        id: 1,
        round: 1,
        phase: 'initial_placement_1',
        message: `Partida iniciada con ${players.length} jugadores. Ronda inicial: colocar ${INITIAL_PLACEMENT_ROUND_1_ARMIES} ejércitos.`,
      },
    ],
  };
}

/**
 * Coloca `count` ejércitos en un país controlado por el jugador actual.
 */
export function placeArmies(
  state: GameState,
  territoryId: string,
  count: number,
): ActionResult {
  if (
    state.phase !== 'initial_placement_1' &&
    state.phase !== 'initial_placement_2' &&
    state.phase !== 'reinforce'
  ) {
    return fail(state, 'No se pueden colocar ejércitos en esta fase.');
  }

  if (!Number.isInteger(count) || count < 1) {
    return fail(state, 'La cantidad de ejércitos debe ser al menos 1.');
  }

  const player = getCurrentPlayer(state);
  const territory = state.territories[territoryId];
  const territoryDef = getTerritoryDefinition(territoryId);
  if (!territory || !territoryDef) {
    return fail(state, `País inexistente: ${territoryId}`);
  }
  if (territory.ownerId !== player.id) {
    return fail(state, 'Solo podés colocar ejércitos en tus propios países.');
  }

  const continentId: ContinentId = territoryDef.continent;
  const continentPending = player.pendingContinentArmies[continentId] ?? 0;
  const maxPlaceableHere = continentPending + player.pendingArmies;

  if (maxPlaceableHere === 0) {
    return fail(
      state,
      'Los ejércitos restantes son bonus de continente: colocalos dentro del continente correspondiente.',
    );
  }

  if (count > maxPlaceableHere) {
    return fail(
      state,
      `Solo disponés de ${maxPlaceableHere} ejércitos colocables en ${territoryDef.name}.`,
    );
  }

  // Consume primero los refuerzos específicos de ese continente y luego los generales
  const fromContinent = Math.min(continentPending, count);
  const fromGeneral = count - fromContinent;

  const updatedContinentArmies: Partial<Record<ContinentId, number>> = {
    ...player.pendingContinentArmies,
  };
  if (fromContinent > 0) {
    const remaining = continentPending - fromContinent;
    if (remaining > 0) {
      updatedContinentArmies[continentId] = remaining;
    } else {
      delete updatedContinentArmies[continentId];
    }
  }

  const updatedPlayer: Player = {
    ...player,
    pendingArmies: player.pendingArmies - fromGeneral,
    pendingContinentArmies: updatedContinentArmies,
  };

  const updatedPlayers = state.players.map((p, idx) =>
    idx === state.currentPlayerIndex ? updatedPlayer : p,
  );

  let nextState: GameState = {
    ...state,
    players: updatedPlayers,
    territories: {
      ...state.territories,
      [territoryId]: {
        ...territory,
        armies: territory.armies + count,
      },
    },
    log: appendLog(
      state,
      `${player.name} colocó ${count} ejército(s) en ${territoryDef.name}.`,
    ),
  };

  // Si terminó de colocar todos sus ejércitos pendientes, avanza fase/jugador
  if (getTotalPendingArmies(updatedPlayer) === 0) {
    if (state.phase === 'initial_placement_1') {
      const nextIndex = state.currentPlayerIndex + 1;
      if (nextIndex < updatedPlayers.length) {
        nextState = {
          ...nextState,
          currentPlayerIndex: nextIndex,
        };
      } else {
        // Todos completaron ronda 1 -> pasan a ronda 2 (3 ejércitos cada uno)
        nextState = {
          ...nextState,
          phase: 'initial_placement_2',
          currentPlayerIndex: 0,
          players: updatedPlayers.map((p) => ({
            ...p,
            pendingArmies: INITIAL_PLACEMENT_ROUND_2_ARMIES,
            pendingContinentArmies: {},
          })),
          log: appendLog(
            nextState,
            `Segunda ronda inicial: cada jugador coloca ${INITIAL_PLACEMENT_ROUND_2_ARMIES} ejércitos.`,
          ),
        };
      }
    } else if (state.phase === 'initial_placement_2') {
      const nextIndex = state.currentPlayerIndex + 1;
      if (nextIndex < updatedPlayers.length) {
        nextState = {
          ...nextState,
          currentPlayerIndex: nextIndex,
        };
      } else {
        // Comienzan los ataques de la ronda 1
        nextState = {
          ...nextState,
          phase: 'attack',
          currentPlayerIndex: 0,
          conqueredThisTurn: false,
          log: appendLog(
            nextState,
            `¡Comienza la fase de ataques! Turno de ${updatedPlayers[0].name}.`,
          ),
        };
      }
    } else if (state.phase === 'reinforce') {
      nextState = {
        ...nextState,
        phase: 'attack',
        conqueredThisTurn: false,
        log: appendLog(
          nextState,
          `${updatedPlayer.name} inicia su fase de ataques.`,
        ),
      };
    }
  }

  return { ok: true, state: nextState };
}

/**
 * Ejecuta un ataque desde `fromId` hacia un país enemigo limítrofe `toId`.
 */
export function attackTerritory(
  state: GameState,
  fromId: string,
  toId: string,
  requestedAttackDice?: number,
  rng: RngFn = Math.random,
): ActionResult {
  if (state.phase !== 'attack') {
    return fail(state, 'Solo se puede atacar durante la fase de ataques.');
  }

  const attacker = getCurrentPlayer(state);
  const from = state.territories[fromId];
  const to = state.territories[toId];
  const fromDef = getTerritoryDefinition(fromId);
  const toDef = getTerritoryDefinition(toId);

  if (!from || !to || !fromDef || !toDef) {
    return fail(state, 'País origen o destino inexistente.');
  }
  if (from.ownerId !== attacker.id) {
    return fail(state, 'Debés atacar desde un país que te pertenezca.');
  }
  if (to.ownerId === attacker.id) {
    return fail(state, 'No podés atacar tu propio país.');
  }
  if (!areNeighbors(fromId, toId)) {
    return fail(state, `${fromDef.name} y ${toDef.name} no son limítrofes.`);
  }
  if (from.armies < 2) {
    return fail(
      state,
      'Necesitás al menos 2 ejércitos en el país origen para atacar.',
    );
  }

  const defenderId = to.ownerId;
  const resolution = resolveCombat(
    from.armies,
    to.armies,
    requestedAttackDice,
    rng,
  );

  const newFromArmies = from.armies - resolution.attackerLosses;
  const newToArmies = to.armies - resolution.defenderLosses;

  const combatResult = {
    fromId,
    toId,
    attackerId: attacker.id,
    defenderId,
    attackerDice: resolution.attackerDice,
    defenderDice: resolution.defenderDice,
    attackerLosses: resolution.attackerLosses,
    defenderLosses: resolution.defenderLosses,
    conquered: resolution.conquered,
  };

  const nextTerritories: Record<string, TerritoryState> = {
    ...state.territories,
    [fromId]: { ...from, armies: newFromArmies },
    [toId]: {
      ...to,
      ownerId: resolution.conquered ? attacker.id : defenderId,
      armies: resolution.conquered ? 0 : newToArmies,
    },
  };

  // Verificar si el defensor quedó eliminado
  let nextPlayers = state.players;
  if (
    resolution.conquered &&
    getPlayerTerritoryCount(defenderId, nextTerritories) === 0
  ) {
    nextPlayers = state.players.map((p) =>
      p.id === defenderId
        ? { ...p, eliminated: true, eliminatedBy: attacker.id }
        : p,
    );
  }

  let nextState: GameState = {
    ...state,
    players: nextPlayers,
    territories: nextTerritories,
    lastCombat: combatResult,
    conqueredThisTurn: state.conqueredThisTurn || resolution.conquered,
    log: appendLog(
      state,
      `${attacker.name} atacó ${toDef.name} desde ${fromDef.name} (Dados: [${resolution.attackerDice.join(',')}] vs [${resolution.defenderDice.join(',')}]). Bajas: -${resolution.attackerLosses} / -${resolution.defenderLosses}.`,
    ),
  };

  if (resolution.conquered) {
    // Si solo puede pasar 1 ejército, lo mueve automáticamente
    if (resolution.minMoveAfterConquest === resolution.maxMoveAfterConquest) {
      const moveCount = resolution.minMoveAfterConquest;
      nextState = {
        ...nextState,
        territories: {
          ...nextState.territories,
          [fromId]: {
            ...nextState.territories[fromId],
            armies: newFromArmies - moveCount,
          },
          [toId]: {
            ...nextState.territories[toId],
            armies: moveCount,
          },
        },
        log: appendLog(
          nextState,
          `${attacker.name} conquistó ${toDef.name} y movió ${moveCount} ejército.`,
        ),
      };
      nextState = checkAnyVictory(nextState);
    } else {
      nextState = {
        ...nextState,
        phase: 'conquest_move',
        pendingConquest: {
          fromId,
          toId,
          minArmies: resolution.minMoveAfterConquest,
          maxArmies: resolution.maxMoveAfterConquest,
        },
        log: appendLog(
          nextState,
          `${attacker.name} conquistó ${toDef.name}. Elegí entre ${resolution.minMoveAfterConquest} y ${resolution.maxMoveAfterConquest} ejércitos para pasar.`,
        ),
      };
    }
  }

  return { ok: true, state: nextState };
}

/**
 * Mueve ejércitos al país recién conquistado (entre 1 y 3 según TEG).
 */
export function moveAfterConquest(
  state: GameState,
  count: number,
): ActionResult {
  if (state.phase !== 'conquest_move' || !state.pendingConquest) {
    return fail(state, 'No hay una conquista pendiente de movimiento.');
  }

  const { fromId, toId, minArmies, maxArmies } = state.pendingConquest;
  if (!Number.isInteger(count) || count < minArmies || count > maxArmies) {
    return fail(
      state,
      `Debés pasar entre ${minArmies} y ${maxArmies} ejércitos.`,
    );
  }

  const from = state.territories[fromId];
  const to = state.territories[toId];
  const toDef = getTerritoryDefinition(toId);
  const attacker = getCurrentPlayer(state);

  let nextState: GameState = {
    ...state,
    phase: 'attack',
    pendingConquest: null,
    territories: {
      ...state.territories,
      [fromId]: { ...from, armies: from.armies - count },
      [toId]: { ...to, armies: to.armies + count },
    },
    log: appendLog(
      state,
      `${attacker.name} pasó ${count} ejército(s) a ${toDef?.name ?? toId}.`,
    ),
  };

  nextState = checkAnyVictory(nextState);
  return { ok: true, state: nextState };
}

/**
 * Reagrupa ejércitos entre dos países limítrofes propios durante la fase de reagrupamiento.
 */
export function regroupArmies(
  state: GameState,
  fromId: string,
  toId: string,
  count: number,
): ActionResult {
  if (state.phase !== 'regroup') {
    return fail(
      state,
      'Solo podés reagrupar ejércitos durante la fase de reagrupamiento.',
    );
  }

  if (!Number.isInteger(count) || count < 1) {
    return fail(state, 'La cantidad a mover debe ser al menos 1.');
  }

  const player = getCurrentPlayer(state);
  const from = state.territories[fromId];
  const to = state.territories[toId];
  const fromDef = getTerritoryDefinition(fromId);
  const toDef = getTerritoryDefinition(toId);

  if (!from || !to || !fromDef || !toDef) {
    return fail(state, 'País origen o destino inexistente.');
  }
  if (from.ownerId !== player.id || to.ownerId !== player.id) {
    return fail(state, 'Ambos países deben pertenecerte para reagrupar.');
  }
  if (!areNeighbors(fromId, toId)) {
    return fail(state, `${fromDef.name} y ${toDef.name} no son limítrofes.`);
  }

  const locked = state.regroupLockedArmies[fromId] ?? 0;
  const maxMovable = from.armies - 1 - locked;
  if (count > maxMovable) {
    return fail(
      state,
      `Solo podés mover hasta ${Math.max(0, maxMovable)} ejército(s) desde ${fromDef.name}.`,
    );
  }

  const nextState: GameState = {
    ...state,
    territories: {
      ...state.territories,
      [fromId]: { ...from, armies: from.armies - count },
      [toId]: { ...to, armies: to.armies + count },
    },
    regroupLockedArmies: {
      ...state.regroupLockedArmies,
      [toId]: (state.regroupLockedArmies[toId] ?? 0) + count,
    },
    log: appendLog(
      state,
      `${player.name} reagrupó ${count} ejército(s) de ${fromDef.name} a ${toDef.name}.`,
    ),
  };

  return { ok: true, state: nextState };
}

/**
 * Canjea 3 tarjetas de país válidas por ejércitos extra durante la fase de refuerzos.
 */
export function tradeCards(
  state: GameState,
  cardIds: readonly string[],
): ActionResult {
  if (state.phase !== 'reinforce') {
    return fail(state, 'Solo podés canjear tarjetas durante la fase de refuerzos.');
  }

  if (cardIds.length !== 3) {
    return fail(state, 'Debés seleccionar exactamente 3 tarjetas para canjear.');
  }

  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== 3) {
    return fail(state, 'Las 3 tarjetas deben ser distintas.');
  }

  const player = getCurrentPlayer(state);
  const selectedCards: TerritoryCard[] = [];
  for (const id of cardIds) {
    const found = player.cards.find((c) => c.id === id);
    if (!found) {
      return fail(state, `No poseés la tarjeta ${id}.`);
    }
    selectedCards.push(found);
  }

  if (!isValidCardTrade(selectedCards)) {
    return fail(
      state,
      'Las 3 tarjetas deben tener el mismo símbolo o los 3 símbolos distintos.',
    );
  }

  const nextTradeNumber = player.tradesCount + 1;
  const reward = getTradeArmiesReward(nextTradeNumber);

  const remainingCards = player.cards.filter((c) => !uniqueIds.has(c.id));
  const discarded = selectedCards.map((c) => ({ ...c, bonusClaimed: false }));

  const updatedPlayer: Player = {
    ...player,
    cards: remainingCards,
    tradesCount: nextTradeNumber,
    pendingArmies: player.pendingArmies + reward,
  };

  const nextState: GameState = {
    ...state,
    players: state.players.map((p, idx) =>
      idx === state.currentPlayerIndex ? updatedPlayer : p,
    ),
    discardPile: [...state.discardPile, ...discarded],
    log: appendLog(
      state,
      `${player.name} realizó su canje #${nextTradeNumber} y recibió ${reward} ejércitos.`,
    ),
  };

  return { ok: true, state: nextState };
}

/**
 * Cobra el bonus de +2 ejércitos directos por tener la tarjeta de un país propio.
 */
export function claimCardBonus(
  state: GameState,
  cardId: string,
): ActionResult {
  if (state.phase !== 'reinforce') {
    return fail(
      state,
      'Solo podés cobrar el bonus de tarjeta durante la fase de refuerzos.',
    );
  }

  const player = getCurrentPlayer(state);
  const card = player.cards.find((c) => c.id === cardId);
  if (!card) {
    return fail(state, 'No poseés esa tarjeta.');
  }

  if (!canClaimTerritoryCardBonus(card, player.id, state.territories)) {
    return fail(
      state,
      'No podés cobrar el bonus: debés controlar el país y no haberlo cobrado antes.',
    );
  }

  const territory = state.territories[card.territoryId];
  const updatedPlayer: Player = {
    ...player,
    cards: player.cards.map((c) =>
      c.id === cardId ? { ...c, bonusClaimed: true } : c,
    ),
  };

  const nextState: GameState = {
    ...state,
    players: state.players.map((p, idx) =>
      idx === state.currentPlayerIndex ? updatedPlayer : p,
    ),
    territories: {
      ...state.territories,
      [card.territoryId]: {
        ...territory,
        armies: territory.armies + 2,
      },
    },
    log: appendLog(
      state,
      `${player.name} cobró +2 ejércitos en ${card.territoryName} por tarjeta propia.`,
    ),
  };

  return { ok: true, state: nextState };
}

/**
 * Finaliza la fase actual del jugador (`attack` -> `regroup` -> siguiente turno).
 */
export function endPhase(
  state: GameState,
  rng: RngFn = Math.random,
): ActionResult {
  if (state.phase === 'game_over') {
    return fail(state, 'La partida ya finalizó.');
  }
  if (
    state.phase === 'initial_placement_1' ||
    state.phase === 'initial_placement_2' ||
    state.phase === 'reinforce'
  ) {
    return fail(
      state,
      'Debés colocar todos tus ejércitos pendientes antes de avanzar de fase.',
    );
  }
  if (state.phase === 'conquest_move') {
    return fail(
      state,
      'Debés elegir cuántos ejércitos pasar al país conquistado.',
    );
  }

  const currentPlayer = getCurrentPlayer(state);

  if (state.phase === 'attack') {
    return {
      ok: true,
      state: {
        ...state,
        phase: 'regroup',
        regroupLockedArmies: {},
        log: appendLog(
          state,
          `${currentPlayer.name} pasa a la fase de reagrupamiento.`,
        ),
      },
    };
  }

  // phase === 'regroup' -> robar tarjeta si conquistó y pasar al siguiente jugador
  let deck = [...state.deck];
  let discardPile = [...state.discardPile];
  let updatedPlayers = [...state.players];
  let log = state.log;

  if (state.conqueredThisTurn) {
    if (deck.length === 0 && discardPile.length > 0) {
      deck = shuffle(discardPile, rng);
      discardPile = [];
    }
    if (deck.length > 0) {
      const [drawnCard, ...restDeck] = deck;
      deck = restDeck;
      updatedPlayers = updatedPlayers.map((p, idx) =>
        idx === state.currentPlayerIndex
          ? { ...p, cards: [...p.cards, drawnCard] }
          : p,
      );
      log = appendLog(
        { ...state, log },
        `${currentPlayer.name} robó una tarjeta de país (${drawnCard.territoryName}).`,
      );
    }
  }

  const nextPlayerIndex = getNextAlivePlayerIndex(
    updatedPlayers,
    state.currentPlayerIndex,
  );
  const wrappedRound = nextPlayerIndex <= state.currentPlayerIndex;
  const nextRound = wrappedRound ? state.round + 1 : state.round;
  const nextPlayer = updatedPlayers[nextPlayerIndex];

  const reinforcements = calculateReinforcements(
    nextPlayer.id,
    state.territories,
  );

  updatedPlayers = updatedPlayers.map((p, idx) =>
    idx === nextPlayerIndex
      ? {
          ...p,
          pendingArmies: reinforcements.base,
          pendingContinentArmies: reinforcements.continentBonuses,
        }
      : p,
  );

  let nextState: GameState = {
    ...state,
    round: nextRound,
    phase: 'reinforce',
    currentPlayerIndex: nextPlayerIndex,
    players: updatedPlayers,
    deck,
    discardPile,
    conqueredThisTurn: false,
    regroupLockedArmies: {},
    log: appendLog(
      { ...state, round: nextRound, phase: 'reinforce', log },
      `Turno de ${nextPlayer.name} (Ronda ${nextRound}). Recibe ${reinforcements.total} ejércitos.`,
    ),
  };

  nextState = checkAnyVictory(nextState);
  return { ok: true, state: nextState };
}
