import type {
  ContinentId,
  GameState,
  Player,
  SecretObjective,
} from '../../types/game.ts';
import {
  getControlledContinents,
  getPlayerTerritoryCount,
  TERRITORIES,
} from '../territories/mapData.ts';

export const COMMON_OBJECTIVE_TERRITORIES = 30;
export const DUEL_OBJECTIVE_TERRITORIES = 40;

/**
 * Meta de países para el Objetivo Común según cantidad de jugadores:
 * - 2 jugadores (Duelo 1 vs 1): 40 países (evita victorias relámpago al arrancar con 25).
 * - 3 a 6 jugadores (TEG clásico): 30 países.
 */
export function getCommonObjectiveTarget(playerCount: number): number {
  return playerCount <= 2 ? DUEL_OBJECTIVE_TERRITORIES : COMMON_OBJECTIVE_TERRITORIES;
}

/**
 * Los 15 objetivos secretos clásicos del TEG (9 de ocupación + 6 de destrucción de color).
 */
export const SECRET_OBJECTIVES: readonly SecretObjective[] = [
  // ===================== OBJETIVOS DE OCUPACIÓN (9) =====================
  {
    id: 'obj_africa_na_eur',
    description:
      'Ocupar África, 5 países de América del Norte y 4 países de Europa.',
    condition: {
      type: 'occupy',
      continents: ['africa'],
      continentCounts: [
        { continent: 'america_del_norte', count: 5 },
        { continent: 'europa', count: 4 },
      ],
    },
  },
  {
    id: 'obj_sa_eur_lim',
    description:
      'Ocupar América del Sur, 7 países de Europa y 3 países limítrofes entre sí (simplificado: 3 países adicionales en cualquier continente).',
    condition: {
      type: 'occupy',
      continents: ['america_del_sur'],
      continentCounts: [{ continent: 'europa', count: 7 }],
      anyTerritories: 3,
    },
  },
  {
    id: 'obj_asia_sa',
    description: 'Ocupar Asia y 2 países de América del Sur.',
    condition: {
      type: 'occupy',
      continents: ['asia'],
      continentCounts: [{ continent: 'america_del_sur', count: 2 }],
    },
  },
  {
    id: 'obj_eur_asia_sa',
    description:
      'Ocupar Europa, 4 países de Asia y 2 países de América del Sur.',
    condition: {
      type: 'occupy',
      continents: ['europa'],
      continentCounts: [
        { continent: 'asia', count: 4 },
        { continent: 'america_del_sur', count: 2 },
      ],
    },
  },
  {
    id: 'obj_na_oc_asia',
    description:
      'Ocupar América del Norte, 2 países de Oceanía y 4 países de Asia.',
    condition: {
      type: 'occupy',
      continents: ['america_del_norte'],
      continentCounts: [
        { continent: 'oceania', count: 2 },
        { continent: 'asia', count: 4 },
      ],
    },
  },
  {
    id: 'obj_oc_multi',
    description:
      'Ocupar 2 países de Oceanía, 2 de África, 2 de América del Sur, 3 de Europa, 4 de América del Norte y 3 de Asia.',
    condition: {
      type: 'occupy',
      continentCounts: [
        { continent: 'oceania', count: 2 },
        { continent: 'africa', count: 2 },
        { continent: 'america_del_sur', count: 2 },
        { continent: 'europa', count: 3 },
        { continent: 'america_del_norte', count: 4 },
        { continent: 'asia', count: 3 },
      ],
    },
  },
  {
    id: 'obj_oc_na_eur',
    description:
      'Ocupar Oceanía, América del Norte y 2 países de Europa.',
    condition: {
      type: 'occupy',
      continents: ['oceania', 'america_del_norte'],
      continentCounts: [{ continent: 'europa', count: 2 }],
    },
  },
  {
    id: 'obj_sa_africa_asia',
    description:
      'Ocupar América del Sur, África y 5 países de Asia.',
    condition: {
      type: 'occupy',
      continents: ['america_del_sur', 'africa'],
      continentCounts: [{ continent: 'asia', count: 5 }],
    },
  },
  {
    id: 'obj_oc_africa_asia',
    description:
      'Ocupar Oceanía, África y 5 países de América del Norte.',
    condition: {
      type: 'occupy',
      continents: ['oceania', 'africa'],
      continentCounts: [{ continent: 'america_del_norte', count: 5 }],
    },
  },

  // ===================== OBJETIVOS DE DESTRUCCIÓN (6) =====================
  {
    id: 'obj_destroy_red',
    description:
      'Destruir al ejército Rojo; de ser imposible, conquistar 30 países.',
    condition: { type: 'destroy', targetColor: 'red' },
  },
  {
    id: 'obj_destroy_blue',
    description:
      'Destruir al ejército Azul; de ser imposible, conquistar 30 países.',
    condition: { type: 'destroy', targetColor: 'blue' },
  },
  {
    id: 'obj_destroy_green',
    description:
      'Destruir al ejército Verde; de ser imposible, conquistar 30 países.',
    condition: { type: 'destroy', targetColor: 'green' },
  },
  {
    id: 'obj_destroy_yellow',
    description:
      'Destruir al ejército Amarillo; de ser imposible, conquistar 30 países.',
    condition: { type: 'destroy', targetColor: 'yellow' },
  },
  {
    id: 'obj_destroy_black',
    description:
      'Destruir al ejército Negro; de ser imposible, conquistar 30 países.',
    condition: { type: 'destroy', targetColor: 'black' },
  },
  {
    id: 'obj_destroy_magenta',
    description:
      'Destruir al ejército Magenta; de ser imposible, conquistar 30 países.',
    condition: { type: 'destroy', targetColor: 'magenta' },
  },
] as const;

export const OBJECTIVE_MAP: Record<string, SecretObjective> = Object.fromEntries(
  SECRET_OBJECTIVES.map((obj) => [obj.id, obj]),
);

export function getObjectiveById(id: string): SecretObjective | undefined {
  return OBJECTIVE_MAP[id];
}

function countOwnedInContinent(
  playerId: string,
  continent: ContinentId,
  state: GameState,
): number {
  let count = 0;
  for (const territory of TERRITORIES) {
    if (
      territory.continent === continent &&
      state.territories[territory.id]?.ownerId === playerId
    ) {
      count += 1;
    }
  }
  return count;
}

export function checkVictoryForPlayer(
  player: Player,
  state: GameState,
): 'secret_objective' | 'common_objective' | 'last_standing' | null {
  if (player.eliminated) return null;

  // 1. Último jugador en pie
  const alivePlayers = state.players.filter((p) => !p.eliminated);
  if (alivePlayers.length === 1 && alivePlayers[0].id === player.id) {
    return 'last_standing';
  }

  // 2. Objetivo común (40 países en 1 vs 1, 30 países en 3–6 jugadores)
  const targetTerritories = getCommonObjectiveTarget(state.players.length);
  const ownedTotal = getPlayerTerritoryCount(player.id, state.territories);
  if (ownedTotal >= targetTerritories) {
    return 'common_objective';
  }

  // En Duelo 1 vs 1 (2 jugadores) cada uno empieza con 25 países, por lo que los objetivos
  // secretos de ocupación (16-22 países) se cumplirían casi al azar en el reparto inicial.
  // Por eso en 1 vs 1 se gana ocupando 40 países o eliminando al rival.
  if (state.players.length <= 2) {
    return null;
  }

  // 3. Objetivo secreto (partidas de 3 a 6 jugadores)
  const objective = getObjectiveById(player.objectiveId);
  if (!objective) return null;

  const { condition } = objective;

  if (condition.type === 'destroy') {
    const targetPlayer = state.players.find((p) => p.color === condition.targetColor);
    // Si el color no participa o es el propio jugador, el objetivo pasa a ser el común (30 países)
    if (!targetPlayer || targetPlayer.id === player.id) {
      return null;
    }
    if (targetPlayer.eliminated && targetPlayer.eliminatedBy === player.id) {
      return 'secret_objective';
    }
    return null;
  }

  // Condición de ocupación
  const controlledContinents = new Set(
    getControlledContinents(player.id, state.territories),
  );

  let requiredTerritories = 0;

  if (condition.continents) {
    for (const cont of condition.continents) {
      if (!controlledContinents.has(cont)) return null;
      requiredTerritories += TERRITORIES.filter((t) => t.continent === cont).length;
    }
  }

  if (condition.continentCounts) {
    for (const req of condition.continentCounts) {
      const owned = countOwnedInContinent(player.id, req.continent, state);
      if (owned < req.count) return null;
      requiredTerritories += req.count;
    }
  }

  if (condition.anyTerritories) {
    if (ownedTotal < requiredTerritories + condition.anyTerritories) {
      return null;
    }
  }

  if (condition.totalTerritories && ownedTotal < condition.totalTerritories) {
    return null;
  }

  return 'secret_objective';
}
