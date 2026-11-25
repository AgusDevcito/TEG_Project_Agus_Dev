import type { PlayerColor } from '../../types/game.ts';

export type CosmeticCategory = 'piece' | 'map' | 'card';

export type PieceStyleId = 'piece_classic' | 'piece_hex' | 'piece_crown' | 'piece_star';
export type MapSkinId =
  | 'map_classic'
  | 'map_parchment'
  | 'map_night'
  | 'map_volcanic'
  | 'map_arctic';
export type CardStyleId = 'card_classic' | 'card_gold' | 'card_tactical' | 'card_royal';

export type CosmeticItemId = PieceStyleId | MapSkinId | CardStyleId;

export interface CosmeticItem {
  id: CosmeticItemId;
  category: CosmeticCategory;
  name: string;
  description: string;
  price: number;
  icon: string;
  previewColors: readonly [string, string, string];
}

export interface MapSkinPalette {
  id: MapSkinId;
  name: string;
  ocean: string;
  frame: string;
  table: string;
  background: string;
  tray: string;
  routeColor: string;
  ambientIntensity: number;
  sunIntensity: number;
}

export const MAP_SKIN_PALETTES: Record<MapSkinId, MapSkinPalette> = {
  map_classic: {
    id: 'map_classic',
    name: 'Océano Atlántico',
    ocean: '#1c4a73',
    frame: '#6b4a2f',
    table: '#3a2a1e',
    background: '#1a120c',
    tray: '#4e3523',
    routeColor: '#e8f1ff',
    ambientIntensity: 0.45,
    sunIntensity: 1.7,
  },
  map_parchment: {
    id: 'map_parchment',
    name: 'Cartografía Antigua',
    ocean: '#5f8496',
    frame: '#8c6239',
    table: '#59422e',
    background: '#2c2015',
    tray: '#6e4c2e',
    routeColor: '#2c2015',
    ambientIntensity: 0.6,
    sunIntensity: 1.5,
  },
  map_night: {
    id: 'map_night',
    name: 'Operación Nocturna',
    ocean: '#0d2238',
    frame: '#2c2530',
    table: '#15131c',
    background: '#0b0a10',
    tray: '#231e2b',
    routeColor: '#8cd3ff',
    ambientIntensity: 0.35,
    sunIntensity: 1.35,
  },
  map_volcanic: {
    id: 'map_volcanic',
    name: 'Frontera Volcánica',
    ocean: '#2b1514',
    frame: '#4a2b20',
    table: '#1b0f0d',
    background: '#120807',
    tray: '#3d2219',
    routeColor: '#ff9d42',
    ambientIntensity: 0.45,
    sunIntensity: 1.65,
  },
  map_arctic: {
    id: 'map_arctic',
    name: 'Expedición Ártica',
    ocean: '#4a7fa1',
    frame: '#7d8e9e',
    table: '#243442',
    background: '#14202b',
    tray: '#536778',
    routeColor: '#ffffff',
    ambientIntensity: 0.65,
    sunIntensity: 1.55,
  },
};

export const SHOP_CATALOG: readonly CosmeticItem[] = [
  // ===================== FICHAS 3D =====================
  {
    id: 'piece_classic',
    category: 'piece',
    name: 'Fichas Clásicas',
    description: 'Discos cilíndricos tradicionales del TEG.',
    price: 0,
    icon: '⚪',
    previewColors: ['#d64541', '#3a7bd5', '#e8c547'],
  },
  {
    id: 'piece_hex',
    category: 'piece',
    name: 'Torreón Hexagonal',
    description: 'Bloques hexagonales tácticos con acabado metálico satinado.',
    price: 150,
    icon: '⬡',
    previewColors: ['#6b7c93', '#d64541', '#c7d3e3'],
  },
  {
    id: 'piece_crown',
    category: 'piece',
    name: 'Estandarte Imperial',
    description: 'Base reforzada coronada por un cristal octaedro dorado.',
    price: 300,
    icon: '👑',
    previewColors: ['#e8c547', '#b8860b', '#fff0a6'],
  },
  {
    id: 'piece_star',
    category: 'piece',
    name: 'Obelisco de Mando',
    description: 'Pirámides estratégicas con aro dorado de comandante.',
    price: 450,
    icon: '🔺',
    previewColors: ['#f2c94c', '#c04ccf', '#3a7bd5'],
  },

  // ===================== MAPAS 3D =====================
  {
    id: 'map_classic',
    category: 'map',
    name: 'Océano Atlántico',
    description: 'Tablero azul profundo clásico con marco de roble.',
    price: 0,
    icon: '🌊',
    previewColors: ['#1c4a73', '#6b4a2f', '#e8f1ff'],
  },
  {
    id: 'map_parchment',
    category: 'map',
    name: 'Cartografía Antigua',
    description: 'Estética de mapa náutico antiguo con tonos cálidos.',
    price: 200,
    icon: '📜',
    previewColors: ['#5f8496', '#8c6239', '#d9c9a8'],
  },
  {
    id: 'map_night',
    category: 'map',
    name: 'Operación Nocturna',
    description: 'Océano abisal oscuro con rutas tácticas celestes.',
    price: 250,
    icon: '🌙',
    previewColors: ['#0d2238', '#2c2530', '#8cd3ff'],
  },
  {
    id: 'map_arctic',
    category: 'map',
    name: 'Expedición Ártica',
    description: 'Aguas glaciares luminosas y marco de acero polar.',
    price: 350,
    icon: '❄️',
    previewColors: ['#4a7fa1', '#7d8e9e', '#ffffff'],
  },
  {
    id: 'map_volcanic',
    category: 'map',
    name: 'Frontera Volcánica',
    description: 'Mar de obsidiana con rutas incandescentes ámbar.',
    price: 400,
    icon: '🌋',
    previewColors: ['#2b1514', '#4a2b20', '#ff9d42'],
  },

  // ===================== TARJETAS =====================
  {
    id: 'card_classic',
    category: 'card',
    name: 'Tarjetas Clásicas',
    description: 'Diseño sobrio tradicional con símbolos de país.',
    price: 0,
    icon: '🃏',
    previewColors: ['#2e241b', '#e8c547', '#f3ead8'],
  },
  {
    id: 'card_gold',
    category: 'card',
    name: 'Edición Dorada',
    description: 'Marco oro brillante con degradado imperial.',
    price: 180,
    icon: '✨',
    previewColors: ['#5c4312', '#f7d76a', '#fff3c4'],
  },
  {
    id: 'card_tactical',
    category: 'card',
    name: 'Radar Táctico',
    description: 'Estilo consola militar verde fosforescente.',
    price: 220,
    icon: '📡',
    previewColors: ['#0f2618', '#34d399', '#a7f3d0'],
  },
  {
    id: 'card_royal',
    category: 'card',
    name: 'Terciopelo Real',
    description: 'Púrpura profundo con bordes oro rosa.',
    price: 320,
    icon: '💎',
    previewColors: ['#2c1238', '#d97be6', '#f7c6ff'],
  },
] as const;

export const SHOP_ITEM_MAP: Record<CosmeticItemId, CosmeticItem> = Object.fromEntries(
  SHOP_CATALOG.map((item) => [item.id, item]),
) as Record<CosmeticItemId, CosmeticItem>;

export const PROFILE_AVATARS = [
  '🎖️',
  '🦅',
  '⚔️',
  '🛡️',
  '👑',
  '🧭',
  '⚓',
  '🐉',
  '🦁',
  '🎯',
] as const;

export const PROFILE_TITLES = [
  'Recluta',
  'Capitán',
  'Comandante',
  'General',
  'Estratega',
  'Mariscal',
] as const;

export const DEFAULT_OWNED_ITEMS: CosmeticItemId[] = [
  'piece_classic',
  'map_classic',
  'card_classic',
];

export const WELCOME_BONUS_POINTS = 250;

export interface MatchRewardInput {
  won: boolean;
  winReason: 'secret_objective' | 'common_objective' | 'last_standing' | null;
  territoriesOwned: number;
  roundsPlayed: number;
  humanParticipated: boolean;
}

export interface MatchRewardBreakdown {
  participation: number;
  victoryBonus: number;
  territoryBonus: number;
  roundBonus: number;
  total: number;
}

/**
 * Calcula los puntos ganados al finalizar una partida para gastar en la tienda.
 */
export function calculateMatchReward(input: MatchRewardInput): MatchRewardBreakdown {
  if (!input.humanParticipated) {
    return {
      participation: 25,
      victoryBonus: 0,
      territoryBonus: 0,
      roundBonus: Math.min(25, input.roundsPlayed * 3),
      total: 25 + Math.min(25, input.roundsPlayed * 3),
    };
  }

  const participation = 50;
  const victoryBonus = input.won
    ? input.winReason === 'secret_objective'
      ? 200
      : 150
    : 0;
  const territoryBonus = Math.max(0, input.territoriesOwned) * 3;
  const roundBonus = Math.min(50, Math.max(1, input.roundsPlayed) * 5);

  return {
    participation,
    victoryBonus,
    territoryBonus,
    roundBonus,
    total: participation + victoryBonus + territoryBonus + roundBonus,
  };
}

export function getDefaultProfileColor(): PlayerColor {
  return 'red';
}
