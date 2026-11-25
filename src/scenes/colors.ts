import type { PlayerColor } from '../types/game.ts';

export const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  red: '#d64541',
  blue: '#3a7bd5',
  green: '#3fae5a',
  yellow: '#e8c547',
  black: '#4a4a55',
  magenta: '#c04ccf',
};

export const PLAYER_COLOR_LABEL: Record<PlayerColor, string> = {
  red: 'Rojo',
  blue: 'Azul',
  green: 'Verde',
  yellow: 'Amarillo',
  black: 'Negro',
  magenta: 'Magenta',
};

export const BOARD_COLORS = {
  ocean: '#1c4a73',
  oceanDeep: '#143654',
  frame: '#6b4a2f',
  table: '#3a2a1e',
  side: '#d9c9a8',
  tree: '#2f6b35',
  trunk: '#5b3b22',
  highlightSource: '#ffffff',
  highlightTarget: '#ffdd55',
};
