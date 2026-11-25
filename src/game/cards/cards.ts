import type {
  CardSymbol,
  RngFn,
  TerritoryCard,
  TerritoryState,
} from '../../types/game.ts';
import { TERRITORIES } from '../territories/mapData.ts';

export function shuffle<T>(items: readonly T[], rng: RngFn = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Genera el mazo de 50 tarjetas de países del TEG.
 */
export function createCountryDeck(rng: RngFn = Math.random): TerritoryCard[] {
  const cards: TerritoryCard[] = TERRITORIES.map((territory) => ({
    id: `card_${territory.id}`,
    territoryId: territory.id,
    territoryName: territory.name,
    symbol: territory.cardSymbol,
    bonusClaimed: false,
  }));
  return shuffle(cards, rng);
}

/**
 * Valida si exactamente 3 tarjetas forman un canje válido en el TEG:
 * - 3 símbolos iguales (galeón, globo o cañón)
 * - 3 símbolos todos distintos
 * - Cualquier combinación que incluya comodines que permita completar uno de los casos anteriores
 */
export function isValidCardTrade(cards: readonly TerritoryCard[]): boolean {
  if (cards.length !== 3) return false;

  const symbols = cards.map((c) => c.symbol);
  const nonWildcards = symbols.filter((s): s is Exclude<CardSymbol, 'comodin'> => s !== 'comodin');

  // Con 1 o más comodines siempre se puede formar un trío válido (iguales o todos distintos)
  if (nonWildcards.length <= 2) {
    return true;
  }

  const unique = new Set(nonWildcards);
  return unique.size === 1 || unique.size === 3;
}

/**
 * Escala oficial de canjes del TEG:
 * 1° canje -> 4 ejércitos
 * 2° canje -> 7 ejércitos
 * 3° canje -> 10 ejércitos
 * 4° canje -> 15 ejércitos
 * 5° en adelante -> +5 por cada canje adicional (20, 25, 30...)
 */
export function getTradeArmiesReward(nextTradeNumber: number): number {
  if (nextTradeNumber <= 1) return 4;
  if (nextTradeNumber === 2) return 7;
  if (nextTradeNumber === 3) return 10;
  if (nextTradeNumber === 4) return 15;
  return 15 + (nextTradeNumber - 4) * 5;
}

/**
 * Verifica si un jugador puede cobrar el bonus de +2 ejércitos por tener
 * la tarjeta de un país que controla actualmente.
 */
export function canClaimTerritoryCardBonus(
  card: TerritoryCard,
  playerId: string,
  territories: Record<string, TerritoryState>,
): boolean {
  if (card.bonusClaimed) return false;
  return territories[card.territoryId]?.ownerId === playerId;
}
