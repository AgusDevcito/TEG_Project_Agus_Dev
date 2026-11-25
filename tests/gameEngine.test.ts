import { describe, expect, it } from 'vitest';
import {
  areNeighbors,
  attackTerritory,
  claimCardBonus,
  CONTINENTS,
  createInitialGameState,
  endPhase,
  getContinentTerritories,
  getCurrentPlayer,
  getTradeArmiesReward,
  isValidCardTrade,
  moveAfterConquest,
  placeArmies,
  regroupArmies,
  resolveCombat,
  SECRET_OBJECTIVES,
  TERRITORIES,
  TERRITORY_MAP,
  tradeCards,
} from '../src/game/index.ts';
import type { GameState, PlayerConfig, TerritoryCard } from '../src/types/game.ts';

function createDeterministicRng(values: number[]): () => number {
  let idx = 0;
  return () => {
    const val = values[idx % values.length];
    idx += 1;
    return val;
  };
}

const TWO_PLAYERS: PlayerConfig[] = [
  { id: 'p1', name: 'Ana', color: 'red' },
  { id: 'p2', name: 'Bruno', color: 'blue' },
];

describe('Mapa oficial del TEG (50 países y 6 continentes)', () => {
  it('contiene exactamente 50 países con IDs únicos', () => {
    expect(TERRITORIES).toHaveLength(50);
    expect(Object.keys(TERRITORY_MAP)).toHaveLength(50);
  });

  it('distribuye correctamente los países por continente', () => {
    expect(getContinentTerritories('america_del_sur')).toHaveLength(6);
    expect(getContinentTerritories('america_del_norte')).toHaveLength(10);
    expect(getContinentTerritories('europa')).toHaveLength(9);
    expect(getContinentTerritories('asia')).toHaveLength(15);
    expect(getContinentTerritories('africa')).toHaveLength(6);
    expect(getContinentTerritories('oceania')).toHaveLength(4);
    expect(Object.keys(CONTINENTS)).toHaveLength(6);
  });

  it('tiene adyacencias 100% simétricas y sin auto-referencias', () => {
    for (const territory of TERRITORIES) {
      expect(territory.neighbors.length).toBeGreaterThan(0);
      expect(territory.neighbors).not.toContain(territory.id);
      for (const neighborId of territory.neighbors) {
        const neighbor = TERRITORY_MAP[neighborId];
        expect(neighbor, `Vecino inexistente: ${neighborId}`).toBeDefined();
        expect(
          neighbor.neighbors,
          `Falta reciprocidad entre ${territory.id} y ${neighborId}`,
        ).toContain(territory.id);
      }
    }
  });

  it('es un grafo conexo (todos los países son alcanzables entre sí)', () => {
    const visited = new Set<string>();
    const queue = [TERRITORIES[0].id];
    visited.add(TERRITORIES[0].id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of TERRITORY_MAP[current].neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    expect(visited.size).toBe(50);
  });

  it('incluye los puentes intercontinentales clásicos del TEG', () => {
    expect(areNeighbors('alaska', 'kamchatka')).toBe(true);
    expect(areNeighbors('groenlandia', 'islandia')).toBe(true);
    expect(areNeighbors('brasil', 'sahara')).toBe(true);
    expect(areNeighbors('chile', 'australia')).toBe(true);
    expect(areNeighbors('india', 'sumatra')).toBe(true);
    expect(areNeighbors('mexico', 'colombia')).toBe(true);
  });
});

describe('Combate del TEG', () => {
  it('favorece al defensor en caso de empates', () => {
    // Atacante saca [5, 3], defensor saca [5, 3] -> ambos empates gana defensor
    const rng = createDeterministicRng([0.7, 0.4, 0.7, 0.4]);
    const res = resolveCombat(3, 2, 2, rng);
    expect(res.attackerDice).toEqual([5, 3]);
    expect(res.defenderDice).toEqual([5, 3]);
    expect(res.attackerLosses).toBe(2);
    expect(res.defenderLosses).toBe(0);
    expect(res.conquered).toBe(false);
  });

  it('conquista el país cuando el atacante supera todos los dados del defensor', () => {
    // Atacante saca [6, 6, 5], defensor saca [4, 2]
    const rng = createDeterministicRng([0.95, 0.95, 0.8, 0.55, 0.2]);
    const res = resolveCombat(5, 2, 3, rng);
    expect(res.attackerLosses).toBe(0);
    expect(res.defenderLosses).toBe(2);
    expect(res.conquered).toBe(true);
    expect(res.minMoveAfterConquest).toBe(1);
    expect(res.maxMoveAfterConquest).toBe(3);
  });

  it('lanza error si el atacante tiene menos de 2 ejércitos', () => {
    expect(() => resolveCombat(1, 1)).toThrow();
  });
});

describe('Tarjetas y Canjes del TEG', () => {
  const makeCard = (id: string, symbol: TerritoryCard['symbol']): TerritoryCard => ({
    id,
    territoryId: id,
    territoryName: id,
    symbol,
    bonusClaimed: false,
  });

  it('valida tríos iguales, distintos y con comodín', () => {
    expect(
      isValidCardTrade([
        makeCard('a', 'galeon'),
        makeCard('b', 'galeon'),
        makeCard('c', 'galeon'),
      ]),
    ).toBe(true);

    expect(
      isValidCardTrade([
        makeCard('a', 'galeon'),
        makeCard('b', 'globo'),
        makeCard('c', 'canon'),
      ]),
    ).toBe(true);

    expect(
      isValidCardTrade([
        makeCard('a', 'galeon'),
        makeCard('b', 'galeon'),
        makeCard('c', 'comodin'),
      ]),
    ).toBe(true);

    expect(
      isValidCardTrade([
        makeCard('a', 'galeon'),
        makeCard('b', 'galeon'),
        makeCard('c', 'globo'),
      ]),
    ).toBe(false);
  });

  it('calcula la escala oficial de canjes (4, 7, 10, 15, 20, 25...)', () => {
    expect(getTradeArmiesReward(1)).toBe(4);
    expect(getTradeArmiesReward(2)).toBe(7);
    expect(getTradeArmiesReward(3)).toBe(10);
    expect(getTradeArmiesReward(4)).toBe(15);
    expect(getTradeArmiesReward(5)).toBe(20);
    expect(getTradeArmiesReward(6)).toBe(25);
  });

  it('define los 15 objetivos secretos oficiales', () => {
    expect(SECRET_OBJECTIVES).toHaveLength(15);
  });
});

describe('Motor de partida del TEG (flujo completo)', () => {
  function setupAttackPhaseState(): GameState {
    const rng = createDeterministicRng([0.1, 0.3, 0.5, 0.7, 0.9]);
    let state = createInitialGameState(TWO_PLAYERS, rng);

    // Completar ronda inicial 1 (5 ejércitos c/u) y ronda inicial 2 (3 ejércitos c/u)
    while (
      state.phase === 'initial_placement_1' ||
      state.phase === 'initial_placement_2'
    ) {
      const current = getCurrentPlayer(state);
      const owned = Object.values(state.territories).find(
        (t) => t.ownerId === current.id,
      )!;
      const res = placeArmies(state, owned.id, current.pendingArmies);
      expect(res.ok).toBe(true);
      state = res.state;
    }

    return state;
  }

  it('reparte los 50 países equitativamente entre 2 jugadores y pasa por las 2 rondas iniciales', () => {
    const state = setupAttackPhaseState();
    expect(state.phase).toBe('attack');
    expect(state.currentPlayerIndex).toBe(0);

    const p1Territories = Object.values(state.territories).filter(
      (t) => t.ownerId === 'p1',
    );
    const p2Territories = Object.values(state.territories).filter(
      (t) => t.ownerId === 'p2',
    );
    expect(p1Territories).toHaveLength(25);
    expect(p2Territories).toHaveLength(25);
  });

  it('permite atacar, conquistar, mover ejércitos, reagrupar y robar tarjeta al finalizar turno', () => {
    let state = setupAttackPhaseState();

    // Preparar un escenario controlado: p1 tiene Argentina (6 ejércitos) y Uruguay (2), p2 tiene Brasil (1)
    state = {
      ...state,
      territories: {
        ...state.territories,
        argentina: { id: 'argentina', ownerId: 'p1', armies: 6 },
        uruguay: { id: 'uruguay', ownerId: 'p1', armies: 2 },
        brasil: { id: 'brasil', ownerId: 'p2', armies: 1 },
      },
    };

    // Atacante saca 6,6,6 vs defensor 1 -> conquista Brasil
    const winRng = createDeterministicRng([0.99, 0.99, 0.99, 0.01]);
    const atkRes = attackTerritory(state, 'argentina', 'brasil', 3, winRng);
    expect(atkRes.ok).toBe(true);
    expect(atkRes.state.phase).toBe('conquest_move');
    expect(atkRes.state.pendingConquest?.minArmies).toBe(1);
    expect(atkRes.state.pendingConquest?.maxArmies).toBe(3);

    // Mover 2 ejércitos a Brasil
    const moveRes = moveAfterConquest(atkRes.state, 2);
    expect(moveRes.ok).toBe(true);
    expect(moveRes.state.phase).toBe('attack');
    expect(moveRes.state.territories.argentina.armies).toBe(4);
    expect(moveRes.state.territories.brasil.armies).toBe(2);
    expect(moveRes.state.territories.brasil.ownerId).toBe('p1');

    // Pasar a reagrupamiento
    const toRegroup = endPhase(moveRes.state);
    expect(toRegroup.ok).toBe(true);
    expect(toRegroup.state.phase).toBe('regroup');

    // Reagrupar 1 ejército de Argentina a Uruguay
    const regroupRes = regroupArmies(toRegroup.state, 'argentina', 'uruguay', 1);
    expect(regroupRes.ok).toBe(true);
    expect(regroupRes.state.territories.argentina.armies).toBe(3);
    expect(regroupRes.state.territories.uruguay.armies).toBe(3);

    // Finalizar turno: p1 roba 1 tarjeta y pasa el turno a p2 en fase reinforce
    const endTurn = endPhase(regroupRes.state);
    expect(endTurn.ok).toBe(true);
    expect(endTurn.state.players[0].cards).toHaveLength(1);
    expect(endTurn.state.currentPlayerIndex).toBe(1);
    expect(endTurn.state.phase).toBe('reinforce');
    expect(endTurn.state.players[1].pendingArmies).toBeGreaterThanOrEqual(3);
  });

  it('permite canjear tarjetas y cobrar bonus +2 por país propio en fase de refuerzos', () => {
    let state = setupAttackPhaseState();
    state = {
      ...state,
      phase: 'reinforce',
      territories: {
        ...state.territories,
        argentina: { id: 'argentina', ownerId: 'p1', armies: 2 },
      },
      players: state.players.map((p, idx) =>
        idx === 0
          ? {
              ...p,
              pendingArmies: 3,
              cards: [
                {
                  id: 'c1',
                  territoryId: 'argentina',
                  territoryName: 'Argentina',
                  symbol: 'galeon',
                  bonusClaimed: false,
                },
                {
                  id: 'c2',
                  territoryId: 'chile',
                  territoryName: 'Chile',
                  symbol: 'globo',
                  bonusClaimed: false,
                },
                {
                  id: 'c3',
                  territoryId: 'peru',
                  territoryName: 'Perú',
                  symbol: 'canon',
                  bonusClaimed: false,
                },
              ],
            }
          : p,
      ),
    };

    // Cobrar +2 por Argentina
    const bonusRes = claimCardBonus(state, 'c1');
    expect(bonusRes.ok).toBe(true);
    expect(bonusRes.state.territories.argentina.armies).toBe(4);

    // No permite cobrar dos veces la misma tarjeta
    const bonusAgain = claimCardBonus(bonusRes.state, 'c1');
    expect(bonusAgain.ok).toBe(false);

    // Canjear las 3 tarjetas (1° canje -> +4 ejércitos)
    const tradeRes = tradeCards(bonusRes.state, ['c1', 'c2', 'c3']);
    expect(tradeRes.ok).toBe(true);
    expect(tradeRes.state.players[0].pendingArmies).toBe(7); // 3 iniciales + 4 del canje
    expect(tradeRes.state.players[0].cards).toHaveLength(0);
    expect(tradeRes.state.discardPile).toHaveLength(3);
  });
});
