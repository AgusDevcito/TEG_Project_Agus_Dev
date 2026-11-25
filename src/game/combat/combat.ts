import type { RngFn } from '../../types/game.ts';

export interface AttackResolution {
  attackerDice: number[];
  defenderDice: number[];
  attackerLosses: number;
  defenderLosses: number;
  conquered: boolean;
  minMoveAfterConquest: number;
  maxMoveAfterConquest: number;
}

/**
 * Tira `count` dados de 6 caras y los devuelve ordenados de mayor a menor.
 */
export function rollDice(count: number, rng: RngFn = Math.random): number[] {
  const results: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const value = Math.floor(rng() * 6) + 1;
    results.push(Math.min(6, Math.max(1, value)));
  }
  return results.sort((a, b) => b - a);
}

/**
 * Calcula la cantidad máxima de dados que puede tirar el atacante
 * según las reglas del TEG (hasta 3, dejando siempre al menos 1 ejército).
 */
export function getMaxAttackDice(attackerArmies: number): number {
  if (attackerArmies < 2) return 0;
  return Math.min(3, attackerArmies - 1);
}

/**
 * Calcula la cantidad de dados que tira el defensor en el TEG (hasta 3).
 */
export function getDefenseDice(defenderArmies: number): number {
  if (defenderArmies < 1) return 0;
  return Math.min(3, defenderArmies);
}

/**
 * Resuelve un combate individual del TEG:
 * - Se comparan los dados ordenados de mayor a menor.
 * - En caso de empate, SIEMPRE gana el defensor.
 * - Si el defensor queda en 0 ejércitos, el país es conquistado.
 */
export function resolveCombat(
  attackerArmies: number,
  defenderArmies: number,
  requestedAttackDice?: number,
  rng: RngFn = Math.random,
): AttackResolution {
  const maxAttackDice = getMaxAttackDice(attackerArmies);
  if (maxAttackDice === 0) {
    throw new Error('Se necesitan al menos 2 ejércitos para atacar.');
  }
  if (defenderArmies < 1) {
    throw new Error('El país defensor debe tener al menos 1 ejército.');
  }

  const attackDiceCount =
    requestedAttackDice !== undefined
      ? Math.min(maxAttackDice, Math.max(1, requestedAttackDice))
      : maxAttackDice;
  const defenseDiceCount = getDefenseDice(defenderArmies);

  const attackerDice = rollDice(attackDiceCount, rng);
  const defenderDice = rollDice(defenseDiceCount, rng);

  const comparisons = Math.min(attackerDice.length, defenderDice.length);
  let attackerLosses = 0;
  let defenderLosses = 0;

  for (let i = 0; i < comparisons; i += 1) {
    if (attackerDice[i] > defenderDice[i]) {
      defenderLosses += 1;
    } else {
      // Empate o mayor del defensor favorece al defensor
      attackerLosses += 1;
    }
  }

  const remainingAttacker = attackerArmies - attackerLosses;
  const remainingDefender = defenderArmies - defenderLosses;
  const conquered = remainingDefender <= 0;

  // En TEG, al conquistar se pasan entre 1 y 3 ejércitos (sin dejar vacío el país origen)
  const minMoveAfterConquest = conquered ? 1 : 0;
  const maxMoveAfterConquest = conquered
    ? Math.min(3, Math.max(1, remainingAttacker - 1))
    : 0;

  return {
    attackerDice,
    defenderDice,
    attackerLosses,
    defenderLosses,
    conquered,
    minMoveAfterConquest,
    maxMoveAfterConquest,
  };
}
