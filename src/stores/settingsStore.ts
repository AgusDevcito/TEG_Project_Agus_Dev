import { create } from 'zustand';

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type BoardTheme = 'classic' | 'parchment' | 'night';
export type BotSpeed = 'slow' | 'normal' | 'fast';
export type BotDifficulty = 'easy' | 'normal' | 'hard';

export interface GameSettings {
  // Audio
  soundEnabled: boolean;
  masterVolume: number; // 0..1

  // Gráficos
  graphicsQuality: GraphicsQuality;
  boardTheme: BoardTheme;
  showTrees: boolean;
  showSeaRoutes: boolean;
  showAllNames: boolean;

  // Jugabilidad y cámara
  botSpeed: BotSpeed;
  botDifficulty: BotDifficulty;
  cameraSensitivity: number; // 0.5..2
  confirmEndTurn: boolean;
}

const STORAGE_KEY = 'teg_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  masterVolume: 0.65,
  graphicsQuality: 'high',
  boardTheme: 'classic',
  showTrees: true,
  showSeaRoutes: true,
  showAllNames: false,
  botSpeed: 'normal',
  botDifficulty: 'normal',
  cameraSensitivity: 1,
  confirmEndTurn: false,
};

function loadSavedSettings(): GameSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignorar errores de cuota o modo privado
  }
}

export interface SettingsStore extends GameSettings {
  updateSettings: (partial: Partial<GameSettings>) => void;
  resetSettings: () => void;
  toggleSound: () => void;
}

const initial = loadSavedSettings();

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...initial,

  updateSettings: (partial) => {
    const next: GameSettings = {
      soundEnabled: partial.soundEnabled ?? get().soundEnabled,
      masterVolume: partial.masterVolume ?? get().masterVolume,
      graphicsQuality: partial.graphicsQuality ?? get().graphicsQuality,
      boardTheme: partial.boardTheme ?? get().boardTheme,
      showTrees: partial.showTrees ?? get().showTrees,
      showSeaRoutes: partial.showSeaRoutes ?? get().showSeaRoutes,
      showAllNames: partial.showAllNames ?? get().showAllNames,
      botSpeed: partial.botSpeed ?? get().botSpeed,
      botDifficulty: partial.botDifficulty ?? get().botDifficulty,
      cameraSensitivity: partial.cameraSensitivity ?? get().cameraSensitivity,
      confirmEndTurn: partial.confirmEndTurn ?? get().confirmEndTurn,
    };
    saveSettings(next);
    set(next);
  },

  resetSettings: () => {
    saveSettings(DEFAULT_SETTINGS);
    set(DEFAULT_SETTINGS);
  },

  toggleSound: () => {
    get().updateSettings({ soundEnabled: !get().soundEnabled });
  },
}));

export const BOT_DELAY_MS: Record<BotSpeed, number> = {
  slow: 900,
  normal: 450,
  fast: 150,
};

export interface BoardPalette {
  ocean: string;
  frame: string;
  table: string;
  background: string;
  tray: string;
  routeColor: string;
  ambientIntensity: number;
  sunIntensity: number;
}

export const BOARD_THEMES: Record<BoardTheme, BoardPalette> = {
  classic: {
    ocean: '#1c4a73',
    frame: '#6b4a2f',
    table: '#3a2a1e',
    background: '#1a120c',
    tray: '#4e3523',
    routeColor: '#e8f1ff',
    ambientIntensity: 0.45,
    sunIntensity: 1.7,
  },
  parchment: {
    ocean: '#5f8496',
    frame: '#8c6239',
    table: '#59422e',
    background: '#2c2015',
    tray: '#6e4c2e',
    routeColor: '#2c2015',
    ambientIntensity: 0.6,
    sunIntensity: 1.5,
  },
  night: {
    ocean: '#0d2238',
    frame: '#2c2530',
    table: '#15131c',
    background: '#0b0a10',
    tray: '#231e2b',
    routeColor: '#8cd3ff',
    ambientIntensity: 0.35,
    sunIntensity: 1.35,
  },
};
