import { create } from 'zustand';
import { playSound } from '../game/audio/soundEngine.ts';
import {
  areNeighbors,
  attackTerritory,
  claimCardBonus,
  createInitialGameState,
  endPhase,
  getCurrentPlayer,
  getTerritoryDefinition,
  moveAfterConquest,
  placeArmies,
  regroupArmies,
  runBotStep,
  tradeCards,
} from '../game/index.ts';
import type { ActionResult, GameState, PlayerConfig } from '../types/game.ts';
import { useSettingsStore } from './settingsStore.ts';

export type AttackDiceSelection = 1 | 2 | 3 | null;

export interface GameStore {
  matchId: string | null;
  game: GameState | null;
  selectedId: string | null;
  hoveredId: string | null;
  error: string | null;
  /** null = máximo permitido por el país origen; 1..3 = cantidad elegida */
  attackDiceCount: AttackDiceSelection;
  /** Permite pausar el avance automático de bots */
  botsPaused: boolean;
  /** Cuenta ataques del bot en el turno actual para respetar su dificultad */
  botAttacksThisTurn: number;
  /** Se incrementa en cada ataque para disparar la animación de dados */
  combatSeq: number;

  newGame: (players: PlayerConfig[]) => void;
  exitGame: () => void;
  /** `bulk`: coloca/mueve el máximo posible (shift + click) */
  clickTerritory: (territoryId: string, bulk?: boolean) => void;
  setAttackDiceCount: (count: AttackDiceSelection) => void;
  toggleBotsPaused: () => void;
  stepBot: () => void;
  endPhase: () => void;
  moveConquest: (count: number) => void;
  tradeCards: (cardIds: string[]) => void;
  claimCardBonus: (cardId: string) => void;
  setHovered: (territoryId: string | null) => void;
  clearSelection: () => void;
  dismissError: () => void;
}

function applyResult(
  set: (partial: Partial<GameStore>) => void,
  result: ActionResult,
  extra: Partial<GameStore> = {},
): boolean {
  if (!result.ok) {
    playSound('error');
    set({ error: result.error ?? 'Acción inválida.' });
    return false;
  }
  set({ game: result.state, error: null, ...extra });
  return true;
}

export const useGameStore = create<GameStore>((set, get) => ({
  matchId: null,
  game: null,
  selectedId: null,
  hoveredId: null,
  error: null,
  attackDiceCount: null,
  botsPaused: false,
  botAttacksThisTurn: 0,
  combatSeq: 0,

  newGame: (players) => {
    try {
      playSound('turn');
      set({
        matchId: `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        game: createInitialGameState(players),
        selectedId: null,
        hoveredId: null,
        error: null,
        attackDiceCount: null,
        botsPaused: false,
        botAttacksThisTurn: 0,
        combatSeq: 0,
      });
    } catch (err) {
      playSound('error');
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  exitGame: () =>
    set({
      matchId: null,
      game: null,
      selectedId: null,
      hoveredId: null,
      error: null,
      attackDiceCount: null,
      botsPaused: false,
      botAttacksThisTurn: 0,
    }),

  setAttackDiceCount: (count) => {
    playSound('select');
    set({ attackDiceCount: count });
  },

  toggleBotsPaused: () => set((s) => ({ botsPaused: !s.botsPaused })),

  stepBot: () => {
    const { game, botsPaused, botAttacksThisTurn } = get();
    if (!game || botsPaused || game.phase === 'game_over') return;
    const player = getCurrentPlayer(game);
    if (!player.isBot) return;

    const difficulty = useSettingsStore.getState().botDifficulty;
    const { state: nextState, actionType } = runBotStep(game, Math.random, {
      difficulty,
      attacksThisTurn: botAttacksThisTurn,
    });
    if (actionType === 'noop') return;

    if (nextState.phase === 'game_over') {
      playSound('victory');
    } else if (actionType === 'attack') {
      playSound(nextState.lastCombat?.conquered ? 'conquest' : 'dice');
    } else if (actionType === 'place') {
      playSound('place');
    } else if (actionType === 'card') {
      playSound('card');
    } else if (actionType === 'regroup' || actionType === 'conquest_move') {
      playSound('regroup');
    } else if (actionType === 'end_phase') {
      playSound('turn');
    }

    const nextBotAttacks =
      actionType === 'attack'
        ? botAttacksThisTurn + 1
        : actionType === 'end_phase' || nextState.currentPlayerIndex !== game.currentPlayerIndex
          ? 0
          : botAttacksThisTurn;

    set((s) => ({
      game: nextState,
      selectedId: null,
      error: null,
      botAttacksThisTurn: nextBotAttacks,
      combatSeq: actionType === 'attack' ? s.combatSeq + 1 : s.combatSeq,
    }));
  },

  clickTerritory: (territoryId, bulk = false) => {
    const { game, selectedId, attackDiceCount } = get();
    if (!game || game.phase === 'game_over') return;
    const player = getCurrentPlayer(game);
    if (player.isBot) return;

    const territory = game.territories[territoryId];
    if (!territory) return;
    const isOwn = territory.ownerId === player.id;

    switch (game.phase) {
      case 'initial_placement_1':
      case 'initial_placement_2':
      case 'reinforce': {
        let amount = 1;
        if (bulk) {
          const continent = getTerritoryDefinition(territoryId)?.continent;
          const continentPending = continent
            ? (player.pendingContinentArmies[continent] ?? 0)
            : 0;
          amount = Math.max(1, player.pendingArmies + continentPending);
        }
        const ok = applyResult(set, placeArmies(game, territoryId, amount));
        if (ok) playSound('place');
        return;
      }

      case 'attack': {
        if (isOwn) {
          if (territory.armies < 2) {
            playSound('error');
            set({
              selectedId: null,
              error: 'Necesitás al menos 2 ejércitos para atacar desde ese país.',
            });
            return;
          }
          playSound('select');
          set({
            selectedId: selectedId === territoryId ? null : territoryId,
            error: null,
          });
          return;
        }
        if (!selectedId) {
          playSound('error');
          set({
            error: 'Primero seleccioná uno de tus países como origen del ataque.',
          });
          return;
        }
        if (!areNeighbors(selectedId, territoryId)) {
          playSound('error');
          set({
            error: 'Ese país no es limítrofe con el país seleccionado.',
          });
          return;
        }
        const requestedDice = attackDiceCount ?? undefined;
        const result = attackTerritory(game, selectedId, territoryId, requestedDice);
        const ok = applyResult(set, result, { combatSeq: get().combatSeq + 1 });
        if (ok) {
          if (result.state.phase === 'game_over') {
            playSound('victory');
          } else if (result.state.lastCombat?.conquered) {
            playSound('conquest');
          } else {
            playSound('dice');
          }
          const from = result.state.territories[selectedId];
          if (result.state.phase === 'attack' && from.armies < 2) {
            set({ selectedId: null });
          }
        }
        return;
      }

      case 'regroup': {
        if (!isOwn) {
          playSound('error');
          set({
            error: 'En el reagrupamiento solo podés mover entre tus países.',
          });
          return;
        }
        if (!selectedId || selectedId === territoryId) {
          playSound('select');
          set({
            selectedId: selectedId === territoryId ? null : territoryId,
            error: null,
          });
          return;
        }
        if (!areNeighbors(selectedId, territoryId)) {
          playSound('select');
          set({ selectedId: territoryId, error: null });
          return;
        }
        const from = game.territories[selectedId];
        const locked = game.regroupLockedArmies[selectedId] ?? 0;
        const movable = from.armies - 1 - locked;
        const amount = bulk ? Math.max(1, movable) : 1;
        const ok = applyResult(set, regroupArmies(game, selectedId, territoryId, amount));
        if (ok) playSound('regroup');
        return;
      }

      default:
        return;
    }
  },

  endPhase: () => {
    const { game } = get();
    if (!game) return;
    if (getCurrentPlayer(game).isBot) return;
    const result = endPhase(game);
    const ok = applyResult(set, result, { selectedId: null });
    if (ok) {
      playSound(result.state.phase === 'game_over' ? 'victory' : 'turn');
    }
  },

  moveConquest: (count) => {
    const { game } = get();
    if (!game) return;
    const result = moveAfterConquest(game, count);
    const ok = applyResult(set, result);
    if (ok) {
      playSound(result.state.phase === 'game_over' ? 'victory' : 'regroup');
    }
  },

  tradeCards: (cardIds) => {
    const { game } = get();
    if (!game) return;
    const ok = applyResult(set, tradeCards(game, cardIds));
    if (ok) playSound('card');
  },

  claimCardBonus: (cardId) => {
    const { game } = get();
    if (!game) return;
    const ok = applyResult(set, claimCardBonus(game, cardId));
    if (ok) playSound('card');
  },

  setHovered: (territoryId) => set({ hoveredId: territoryId }),
  clearSelection: () => set({ selectedId: null }),
  dismissError: () => set({ error: null }),
}));

/**
 * Indica si un país es un destino válido para la acción del país seleccionado
 * (ataque a enemigo limítrofe o reagrupamiento a país propio limítrofe).
 */
export function isValidTarget(
  game: GameState | null,
  selectedId: string | null,
  territoryId: string,
): boolean {
  if (!game || !selectedId || selectedId === territoryId) return false;
  if (!areNeighbors(selectedId, territoryId)) return false;
  const player = getCurrentPlayer(game);
  if (player.isBot) return false;
  const owner = game.territories[territoryId]?.ownerId;
  if (game.phase === 'attack') return owner !== player.id;
  if (game.phase === 'regroup') return owner === player.id;
  return false;
}
