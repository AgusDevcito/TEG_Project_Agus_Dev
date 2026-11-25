import type { ContinentId, GameState, RngFn } from '../../types/game.ts';
import {
  canClaimTerritoryCardBonus,
  isValidCardTrade,
} from '../cards/cards.ts';
import { getObjectiveById } from '../cards/objectives.ts';
import {
  attackTerritory,
  claimCardBonus,
  endPhase,
  getCurrentPlayer,
  moveAfterConquest,
  placeArmies,
  regroupArmies,
  tradeCards,
} from '../engine/gameEngine.ts';
import {
  CONTINENTS,
  getContinentTerritories,
  getControlledContinents,
  getTerritoryDefinition,
  TERRITORY_MAP,
} from '../territories/mapData.ts';

export type BotDifficultyLevel = 'easy' | 'normal' | 'hard';

export interface BotStepOptions {
  difficulty?: BotDifficultyLevel;
  /** Cantidad de ataques ya realizados por este bot en el turno actual */
  attacksThisTurn?: number;
}

export interface BotStepResult {
  state: GameState;
  actionType: 'place' | 'attack' | 'conquest_move' | 'regroup' | 'card' | 'end_phase' | 'noop';
}

function findValidTrade(cards: GameState['players'][number]['cards']): string[] | null {
  if (cards.length < 3) return null;
  for (let i = 0; i < cards.length - 2; i += 1) {
    for (let j = i + 1; j < cards.length - 1; j += 1) {
      for (let k = j + 1; k < cards.length; k += 1) {
        if (isValidCardTrade([cards[i], cards[j], cards[k]])) {
          return [cards[i].id, cards[j].id, cards[k].id];
        }
      }
    }
  }
  return null;
}

function getBorderTerritories(state: GameState, playerId: string, continent?: ContinentId): string[] {
  const owned = Object.values(state.territories).filter((t) => {
    if (t.ownerId !== playerId) return false;
    if (continent && getTerritoryDefinition(t.id)?.continent !== continent) return false;
    return true;
  });

  const borders = owned.filter((t) => {
    const def = TERRITORY_MAP[t.id];
    return def.neighbors.some((nId) => state.territories[nId]?.ownerId !== playerId);
  });

  return (borders.length > 0 ? borders : owned).map((t) => t.id);
}

/**
 * Devuelve el continente más cercano a completar que el bot todavía no controla totalmente.
 */
function findTargetContinent(state: GameState, playerId: string): ContinentId | null {
  let bestContinent: ContinentId | null = null;
  let bestRatio = 0;

  for (const continentId of Object.keys(CONTINENTS) as ContinentId[]) {
    const territories = getContinentTerritories(continentId);
    const owned = territories.filter(
      (t) => state.territories[t.id]?.ownerId === playerId,
    ).length;
    if (owned === 0 || owned === territories.length) continue;
    const ratio = owned / territories.length;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestContinent = continentId;
    }
  }
  return bestContinent;
}

/**
 * Detecta continentes controlados por rivales para priorizar romper sus bonus.
 */
function getEnemyControlledContinents(state: GameState, playerId: string): Set<ContinentId> {
  const result = new Set<ContinentId>();
  for (const p of state.players) {
    if (p.id === playerId || p.eliminated) continue;
    for (const cId of getControlledContinents(p.id, state.territories)) {
      result.add(cId);
    }
  }
  return result;
}

function getObjectivePriorityContinents(state: GameState, playerId: string): Set<ContinentId> {
  const result = new Set<ContinentId>();
  if (state.players.length <= 2) return result;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return result;
  const obj = getObjectiveById(player.objectiveId);
  if (!obj || obj.condition.type !== 'occupy') return result;

  for (const c of obj.condition.continents ?? []) result.add(c);
  for (const c of obj.condition.continentCounts ?? []) result.add(c.continent);
  return result;
}

function pickReinforcementTarget(
  state: GameState,
  playerId: string,
  candidates: string[],
  difficulty: BotDifficultyLevel,
  rng: RngFn,
): string {
  if (difficulty === 'easy') {
    return candidates[Math.floor(rng() * candidates.length)];
  }

  const targetContinent = findTargetContinent(state, playerId);
  const enemyContinents = getEnemyControlledContinents(state, playerId);
  const objContinents =
    difficulty === 'hard' ? getObjectivePriorityContinents(state, playerId) : new Set<ContinentId>();

  let bestId = candidates[0];
  let bestScore = -Infinity;

  for (const id of candidates) {
    const territory = state.territories[id];
    const def = TERRITORY_MAP[id];
    let score = rng() * 0.8;

    let adjacentWeakEnemies = 0;
    let adjacentEnemyThreat = 0;
    let touchesEnemyContinent = false;
    let touchesTargetContinentEnemy = false;

    for (const nId of def.neighbors) {
      const neighbor = state.territories[nId];
      if (!neighbor || neighbor.ownerId === playerId) continue;
      const nDef = TERRITORY_MAP[nId];
      if (neighbor.armies <= 2) adjacentWeakEnemies += 1;
      adjacentEnemyThreat += neighbor.armies;
      if (enemyContinents.has(nDef.continent)) touchesEnemyContinent = true;
      if (targetContinent && nDef.continent === targetContinent) {
        touchesTargetContinentEnemy = true;
      }
    }

    // Concentrar fuerza en un punto ofensivo prometedor
    score += Math.min(territory.armies, 8) * (difficulty === 'hard' ? 0.65 : 0.45);
    score += adjacentWeakEnemies * 1.6;
    if (touchesTargetContinentEnemy) score += 2.2;
    if (touchesEnemyContinent) score += difficulty === 'hard' ? 3.2 : 1.5;
    if (objContinents.has(def.continent)) score += 1.8;

    // En difícil, reforzar también entradas amenazadas de continentes propios
    if (difficulty === 'hard' && adjacentEnemyThreat > territory.armies + 2) {
      score += 1.4;
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  return bestId;
}

/**
 * Ejecuta un único paso atómico para el jugador bot actual según su dificultad:
 * - easy: disperso, conservador, máximo 3 ataques por turno (ideal para partidas tranquilas).
 * - normal: concentra refuerzos en fronteras, busca continentes y ataca con ventaja clara.
 * - hard: rompe continentes rivales, persigue objetivo secreto y presiona con ataques encadenados.
 */
export function runBotStep(
  state: GameState,
  rng: RngFn = Math.random,
  options: BotStepOptions = {},
): BotStepResult {
  if (state.phase === 'game_over') {
    return { state, actionType: 'noop' };
  }

  const player = getCurrentPlayer(state);
  if (!player.isBot) {
    return { state, actionType: 'noop' };
  }

  const difficulty = options.difficulty ?? 'normal';
  const attacksThisTurn = options.attacksThisTurn ?? 0;

  // 1. Fase de colocación inicial o refuerzos
  if (
    state.phase === 'initial_placement_1' ||
    state.phase === 'initial_placement_2' ||
    state.phase === 'reinforce'
  ) {
    if (state.phase === 'reinforce') {
      const bonusCard = player.cards.find((c) =>
        canClaimTerritoryCardBonus(c, player.id, state.territories),
      );
      if (bonusCard) {
        const res = claimCardBonus(state, bonusCard.id);
        if (res.ok) return { state: res.state, actionType: 'card' };
      }

      // En fácil solo canjea cuando junta 4+ cartas; en normal/difícil canjea en cuanto puede
      const shouldTrade = difficulty !== 'easy' || player.cards.length >= 4;
      if (shouldTrade) {
        const tradeIds = findValidTrade(player.cards);
        if (tradeIds) {
          const res = tradeCards(state, tradeIds);
          if (res.ok) return { state: res.state, actionType: 'card' };
        }
      }
    }

    const pendingContinent = (
      Object.entries(player.pendingContinentArmies) as [ContinentId, number | undefined][]
    ).find(([, count]) => (count ?? 0) > 0);

    if (pendingContinent) {
      const [continentId, count] = pendingContinent;
      const candidates = getBorderTerritories(state, player.id, continentId);
      if (candidates.length > 0 && count) {
        const targetId = pickReinforcementTarget(state, player.id, candidates, difficulty, rng);
        const batch = difficulty === 'easy' ? 1 : Math.min(count, 2);
        const res = placeArmies(state, targetId, batch);
        if (res.ok) return { state: res.state, actionType: 'place' };
      }
    }

    if (player.pendingArmies > 0) {
      const candidates = getBorderTerritories(state, player.id);
      if (candidates.length > 0) {
        const targetId = pickReinforcementTarget(state, player.id, candidates, difficulty, rng);
        const amount =
          difficulty === 'easy'
            ? 1
            : state.phase === 'reinforce'
              ? Math.min(player.pendingArmies, difficulty === 'hard' ? 3 : 2)
              : Math.min(player.pendingArmies, 2);
        const res = placeArmies(state, targetId, amount);
        if (res.ok) return { state: res.state, actionType: 'place' };
      }
    }
  }

  // 2. Movimiento tras conquista
  if (state.phase === 'conquest_move' && state.pendingConquest) {
    const { fromId, toId, minArmies, maxArmies } = state.pendingConquest;
    const toHasEnemies = TERRITORY_MAP[toId].neighbors.some(
      (nId) => state.territories[nId]?.ownerId !== player.id,
    );
    const fromHasEnemies = TERRITORY_MAP[fromId].neighbors.some(
      (nId) => state.territories[nId]?.ownerId !== player.id,
    );

    const moveCount =
      difficulty === 'easy'
        ? minArmies
        : toHasEnemies || !fromHasEnemies
          ? maxArmies
          : minArmies;
    const res = moveAfterConquest(state, moveCount);
    if (res.ok) return { state: res.state, actionType: 'conquest_move' };
  }

  // 3. Fase de ataques
  if (state.phase === 'attack') {
    const maxAttacks = difficulty === 'easy' ? 3 : difficulty === 'normal' ? 7 : 25;
    if (attacksThisTurn < maxAttacks) {
      const enemyContinents = getEnemyControlledContinents(state, player.id);
      const targetContinent = findTargetContinent(state, player.id);
      const objContinents =
        difficulty === 'hard'
          ? getObjectivePriorityContinents(state, player.id)
          : new Set<ContinentId>();

      const minAdvantage = difficulty === 'easy' ? 3 : difficulty === 'normal' ? 2 : 1;

      let bestMove: { fromId: string; toId: string; score: number } | null = null;

      for (const territory of Object.values(state.territories)) {
        if (territory.ownerId !== player.id || territory.armies < 2) continue;
        const def = TERRITORY_MAP[territory.id];
        for (const neighborId of def.neighbors) {
          const enemy = state.territories[neighborId];
          if (!enemy || enemy.ownerId === player.id) continue;

          const advantage = territory.armies - enemy.armies;
          const strongEnough =
            advantage >= minAdvantage ||
            (difficulty !== 'easy' && territory.armies >= 4 && enemy.armies <= 2);
          if (!strongEnough) continue;

          const enemyDef = TERRITORY_MAP[neighborId];
          let score = advantage + (enemy.armies === 1 ? 1.5 : 0);
          if (difficulty !== 'easy' && targetContinent === enemyDef.continent) {
            score += 2.0;
          }
          if (difficulty === 'hard' && enemyContinents.has(enemyDef.continent)) {
            score += 3.5;
          }
          if (difficulty === 'hard' && objContinents.has(enemyDef.continent)) {
            score += 2.2;
          }

          if (!bestMove || score > bestMove.score) {
            bestMove = { fromId: territory.id, toId: neighborId, score };
          }
        }
      }

      if (bestMove) {
        const res = attackTerritory(state, bestMove.fromId, bestMove.toId, undefined, rng);
        if (res.ok) return { state: res.state, actionType: 'attack' };
      }
    }

    const res = endPhase(state, rng);
    if (res.ok) return { state: res.state, actionType: 'end_phase' };
  }

  // 4. Fase de reagrupamiento: mover ejércitos sobrantes desde el interior hacia fronteras
  if (state.phase === 'regroup') {
    for (const territory of Object.values(state.territories)) {
      if (territory.ownerId !== player.id) continue;
      const locked = state.regroupLockedArmies[territory.id] ?? 0;
      const movable = territory.armies - 1 - locked;
      if (movable <= 0) continue;

      const def = TERRITORY_MAP[territory.id];
      const touchesEnemy = def.neighbors.some(
        (nId) => state.territories[nId]?.ownerId !== player.id,
      );
      if (touchesEnemy) continue;

      const borderFriend = def.neighbors.find((nId) => {
        const friend = state.territories[nId];
        if (!friend || friend.ownerId !== player.id) return false;
        return TERRITORY_MAP[nId].neighbors.some(
          (nn) => state.territories[nn]?.ownerId !== player.id,
        );
      });

      if (borderFriend) {
        const res = regroupArmies(state, territory.id, borderFriend, movable);
        if (res.ok) return { state: res.state, actionType: 'regroup' };
      }
    }

    const res = endPhase(state, rng);
    if (res.ok) return { state: res.state, actionType: 'end_phase' };
  }

  return { state, actionType: 'noop' };
}
