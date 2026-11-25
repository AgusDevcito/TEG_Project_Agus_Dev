import type { ContinentId, TerritoryState } from '../../types/game.ts';
import {
  CONTINENTS,
  getControlledContinents,
  getPlayerTerritoryCount,
} from '../territories/mapData.ts';

export interface ReinforcementBreakdown {
  base: number;
  continentBonuses: Partial<Record<ContinentId, number>>;
  continentBonusTotal: number;
  total: number;
}

/**
 * Calcula los refuerzos de un jugador al iniciar su fase de incorporación:
 * - Base: mitad de sus países redondeada hacia abajo (mínimo 3).
 * - Bonus por continentes completos (en TEG deben colocarse dentro de cada continente).
 */
export function calculateReinforcements(
  playerId: string,
  territories: Record<string, TerritoryState>,
): ReinforcementBreakdown {
  const ownedCount = getPlayerTerritoryCount(playerId, territories);
  const base = Math.max(3, Math.floor(ownedCount / 2));

  const controlled = getControlledContinents(playerId, territories);
  const continentBonuses: Partial<Record<ContinentId, number>> = {};
  let continentBonusTotal = 0;

  for (const continentId of controlled) {
    const bonus = CONTINENTS[continentId].bonus;
    continentBonuses[continentId] = bonus;
    continentBonusTotal += bonus;
  }

  return {
    base,
    continentBonuses,
    continentBonusTotal,
    total: base + continentBonusTotal,
  };
}
