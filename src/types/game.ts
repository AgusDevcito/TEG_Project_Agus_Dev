export const PLAYER_COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
  'black',
  'magenta',
] as const;

export type PlayerColor = (typeof PLAYER_COLORS)[number];

export const CONTINENT_IDS = [
  'america_del_sur',
  'america_del_norte',
  'europa',
  'asia',
  'africa',
  'oceania',
] as const;

export type ContinentId = (typeof CONTINENT_IDS)[number];

export type CardSymbol = 'galeon' | 'globo' | 'canon' | 'comodin';

export type GamePhase =
  | 'initial_placement_1'
  | 'initial_placement_2'
  | 'reinforce'
  | 'attack'
  | 'conquest_move'
  | 'regroup'
  | 'game_over';

export interface ContinentDefinition {
  id: ContinentId;
  name: string;
  bonus: number;
  color: string;
}

export interface TerritoryDefinition {
  id: string;
  name: string;
  continent: ContinentId;
  neighbors: readonly string[];
  cardSymbol: CardSymbol;
  /** Normalized board coordinates [x, z] in [-10, 10] x [-6, 6] for 3D layout */
  position: readonly [number, number];
}

export interface TerritoryState {
  id: string;
  ownerId: string;
  armies: number;
}

export interface TerritoryCard {
  id: string;
  territoryId: string;
  territoryName: string;
  symbol: CardSymbol;
  bonusClaimed: boolean;
}

export type ObjectiveCondition =
  | {
      type: 'occupy';
      /** Continents that must be fully controlled */
      continents?: readonly ContinentId[];
      /** Partial continent requirements: { continent, count } */
      continentCounts?: readonly { continent: ContinentId; count: number }[];
      /** Extra territories anywhere on the board (beyond the above) */
      anyTerritories?: number;
      /** Minimum total territories */
      totalTerritories?: number;
    }
  | {
      type: 'destroy';
      targetColor: PlayerColor;
    };

export interface SecretObjective {
  id: string;
  description: string;
  condition: ObjectiveCondition;
}

export interface PlayerConfig {
  id: string;
  name: string;
  color: PlayerColor;
  isBot?: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  isBot: boolean;
  eliminated: boolean;
  eliminatedBy: string | null;
  objectiveId: string;
  cards: TerritoryCard[];
  tradesCount: number;
  /** General armies waiting to be placed */
  pendingArmies: number;
  /** Continent-specific bonus armies waiting to be placed */
  pendingContinentArmies: Partial<Record<ContinentId, number>>;
}

export interface CombatResult {
  fromId: string;
  toId: string;
  attackerId: string;
  defenderId: string;
  attackerDice: number[];
  defenderDice: number[];
  attackerLosses: number;
  defenderLosses: number;
  conquered: boolean;
}

export interface PendingConquest {
  fromId: string;
  toId: string;
  minArmies: number;
  maxArmies: number;
}

export interface GameLogEntry {
  id: number;
  round: number;
  phase: GamePhase;
  message: string;
}

export interface GameState {
  round: number;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  territories: Record<string, TerritoryState>;
  deck: TerritoryCard[];
  discardPile: TerritoryCard[];
  conqueredThisTurn: boolean;
  pendingConquest: PendingConquest | null;
  /** Tracks armies already moved into a territory during current regroup phase */
  regroupLockedArmies: Record<string, number>;
  lastCombat: CombatResult | null;
  winnerId: string | null;
  winReason: 'secret_objective' | 'common_objective' | 'last_standing' | null;
  log: GameLogEntry[];
}

export type RngFn = () => number;

export interface ActionResult {
  ok: boolean;
  state: GameState;
  error?: string;
}
