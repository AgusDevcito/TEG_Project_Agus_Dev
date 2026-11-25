import { describe, expect, it } from 'vitest';
import { runBotStep } from '../src/game/ai/simpleBot.ts';
import {
  checkVictoryForPlayer,
  createInitialGameState,
  getCommonObjectiveTarget,
  getCurrentPlayer,
} from '../src/game/index.ts';
import type { PlayerConfig } from '../src/types/game.ts';

function createRng(seed = 42): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('Bot local y balance 1 vs 1', () => {
  it('avanza las rondas iniciales y completa turnos en los 3 niveles de dificultad', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      const rng = createRng(123);
      const players: PlayerConfig[] = [
        { id: 'b1', name: 'Bot Alfa', color: 'red', isBot: true },
        { id: 'b2', name: 'Bot Beta', color: 'blue', isBot: true },
      ];

      let state = createInitialGameState(players, rng);
      let steps = 0;
      let attacks = 0;

      while (steps < 220 && state.round < 3 && state.phase !== 'game_over') {
        const res = runBotStep(state, rng, { difficulty, attacksThisTurn: attacks });
        expect(res.actionType).not.toBe('noop');
        attacks =
          res.actionType === 'attack'
            ? attacks + 1
            : res.actionType === 'end_phase'
              ? 0
              : attacks;
        state = res.state;
        steps += 1;
      }

      expect(state.phase === 'game_over' || state.round >= 2).toBe(true);
      expect(steps).toBeGreaterThan(10);
    }
  });

  it('en Duelo 1 vs 1 exige 40 países (no gana al llegar a 30 ni por objetivos secretos de ocupación)', () => {
    expect(getCommonObjectiveTarget(2)).toBe(40);
    expect(getCommonObjectiveTarget(3)).toBe(30);

    const rng = createRng(99);
    const state = createInitialGameState(
      [
        { id: 'p1', name: 'Humano', color: 'red' },
        { id: 'p2', name: 'Bot', color: 'blue', isBot: true },
      ],
      rng,
    );

    // Dar 30 países exactos a p1 (y asignarle el objetivo secreto más corto)
    const ids = Object.keys(state.territories);
    const territories = { ...state.territories };
    ids.forEach((id, i) => {
      territories[id] = { id, ownerId: i < 30 ? 'p1' : 'p2', armies: 2 };
    });
    const duelState = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'p1' ? { ...p, objectiveId: 'obj_oc_multi' } : p,
      ),
      territories,
    };

    // Con 30 países en 1 vs 1 todavía NO gana
    expect(checkVictoryForPlayer(duelState.players[0], duelState)).toBeNull();

    // Con 40 países sí gana por objetivo común
    ids.forEach((id, i) => {
      territories[id] = { id, ownerId: i < 40 ? 'p1' : 'p2', armies: 2 };
    });
    expect(
      checkVictoryForPlayer(duelState.players[0], { ...duelState, territories }),
    ).toBe('common_objective');
  });

  it('no ejecuta acciones si el jugador actual es humano', () => {
    const rng = createRng(7);
    const state = createInitialGameState(
      [
        { id: 'h1', name: 'Humano', color: 'red', isBot: false },
        { id: 'b1', name: 'Bot', color: 'blue', isBot: true },
      ],
      rng,
    );

    expect(getCurrentPlayer(state).isBot).toBe(false);
    const res = runBotStep(state, rng);
    expect(res.actionType).toBe('noop');
    expect(res.state).toBe(state);
  });
});
