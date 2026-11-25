import { create } from 'zustand';
import {
  DEFAULT_OWNED_ITEMS,
  SHOP_ITEM_MAP,
  WELCOME_BONUS_POINTS,
  type CardStyleId,
  type CosmeticItemId,
  type MapSkinId,
  type MatchRewardBreakdown,
  type PieceStyleId,
} from '../game/shop/catalog.ts';
import { TUTORIAL_GRADUATION_REWARD } from '../game/tutorial/tutorialData.ts';
import type { PlayerColor } from '../types/game.ts';

export interface PlayerProfile {
  username: string;
  avatar: string;
  favoriteColor: PlayerColor;
  title: string;
}

export interface EquippedCosmetics {
  piece: PieceStyleId;
  map: MapSkinId;
  card: CardStyleId;
}

export interface ProfileStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  totalPointsEarned: number;
}

export interface MatchHistoryEntry {
  matchId: string;
  dateIso: string;
  won: boolean;
  winnerName: string;
  rounds: number;
  pointsEarned: number;
}

interface PersistedProfileData {
  registered: boolean;
  profile: PlayerProfile;
  points: number;
  ownedItems: CosmeticItemId[];
  equipped: EquippedCosmetics;
  stats: ProfileStats;
  history: MatchHistoryEntry[];
  rewardedMatchIds: string[];
  tutorialRewardClaimed: boolean;
}

const STORAGE_KEY = 'teg_profile_v1';

export const DEFAULT_PROFILE_DATA: PersistedProfileData = {
  registered: false,
  profile: {
    username: 'Comandante',
    avatar: '🎖️',
    favoriteColor: 'red',
    title: 'Estratega',
  },
  points: WELCOME_BONUS_POINTS,
  ownedItems: [...DEFAULT_OWNED_ITEMS],
  equipped: {
    piece: 'piece_classic',
    map: 'map_classic',
    card: 'card_classic',
  },
  stats: {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    totalPointsEarned: WELCOME_BONUS_POINTS,
  },
  history: [],
  rewardedMatchIds: [],
  tutorialRewardClaimed: false,
};

function loadProfile(): PersistedProfileData {
  if (typeof window === 'undefined') return DEFAULT_PROFILE_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE_DATA;
    const parsed = JSON.parse(raw) as Partial<PersistedProfileData>;
    return {
      ...DEFAULT_PROFILE_DATA,
      ...parsed,
      profile: { ...DEFAULT_PROFILE_DATA.profile, ...parsed.profile },
      equipped: { ...DEFAULT_PROFILE_DATA.equipped, ...parsed.equipped },
      stats: { ...DEFAULT_PROFILE_DATA.stats, ...parsed.stats },
      ownedItems: Array.isArray(parsed.ownedItems)
        ? Array.from(new Set([...DEFAULT_OWNED_ITEMS, ...parsed.ownedItems]))
        : [...DEFAULT_OWNED_ITEMS],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      rewardedMatchIds: Array.isArray(parsed.rewardedMatchIds)
        ? parsed.rewardedMatchIds
        : [],
    };
  } catch {
    return DEFAULT_PROFILE_DATA;
  }
}

function saveProfile(data: PersistedProfileData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

export interface ShopActionResult {
  ok: boolean;
  error?: string;
}

export interface ProfileStore extends PersistedProfileData {
  saveProfileInfo: (partial: Partial<PlayerProfile>) => void;
  buyItem: (itemId: CosmeticItemId) => ShopActionResult;
  equipItem: (itemId: CosmeticItemId) => ShopActionResult;
  recordMatchReward: (params: {
    matchId: string;
    won: boolean;
    winnerName: string;
    rounds: number;
    reward: MatchRewardBreakdown;
  }) => boolean;
  claimTutorialReward: () => boolean;
  resetProfile: () => void;
}

function extractPersisted(state: ProfileStore): PersistedProfileData {
  return {
    registered: state.registered,
    profile: state.profile,
    points: state.points,
    ownedItems: state.ownedItems,
    equipped: state.equipped,
    stats: state.stats,
    history: state.history,
    rewardedMatchIds: state.rewardedMatchIds,
    tutorialRewardClaimed: state.tutorialRewardClaimed,
  };
}

const initial = loadProfile();

export const useProfileStore = create<ProfileStore>((set, get) => ({
  ...initial,

  saveProfileInfo: (partial) => {
    const current = get();
    const cleanedName = (partial.username ?? current.profile.username).trim();
    const next: PersistedProfileData = {
      ...extractPersisted(current),
      registered: true,
      profile: {
        ...current.profile,
        ...partial,
        username: cleanedName || current.profile.username,
      },
    };
    saveProfile(next);
    set(next);
  },

  buyItem: (itemId) => {
    const item = SHOP_ITEM_MAP[itemId];
    if (!item) return { ok: false, error: 'Artículo inexistente.' };

    const current = get();
    if (current.ownedItems.includes(itemId)) {
      return { ok: false, error: 'Ya poseés este cosmético.' };
    }
    if (current.points < item.price) {
      return {
        ok: false,
        error: `Te faltan ${item.price - current.points} pts para comprar ${item.name}.`,
      };
    }

    const nextEquipped: EquippedCosmetics = { ...current.equipped };
    if (item.category === 'piece') nextEquipped.piece = item.id as PieceStyleId;
    if (item.category === 'map') nextEquipped.map = item.id as MapSkinId;
    if (item.category === 'card') nextEquipped.card = item.id as CardStyleId;

    const next: PersistedProfileData = {
      ...extractPersisted(current),
      points: current.points - item.price,
      ownedItems: [...current.ownedItems, itemId],
      equipped: nextEquipped,
    };
    saveProfile(next);
    set(next);
    return { ok: true };
  },

  equipItem: (itemId) => {
    const item = SHOP_ITEM_MAP[itemId];
    if (!item) return { ok: false, error: 'Artículo inexistente.' };

    const current = get();
    if (!current.ownedItems.includes(itemId)) {
      return { ok: false, error: 'Primero tenés que comprar este cosmético.' };
    }

    const nextEquipped: EquippedCosmetics = { ...current.equipped };
    if (item.category === 'piece') nextEquipped.piece = item.id as PieceStyleId;
    if (item.category === 'map') nextEquipped.map = item.id as MapSkinId;
    if (item.category === 'card') nextEquipped.card = item.id as CardStyleId;

    const next: PersistedProfileData = {
      ...extractPersisted(current),
      equipped: nextEquipped,
    };
    saveProfile(next);
    set(next);
    return { ok: true };
  },

  recordMatchReward: ({ matchId, won, winnerName, rounds, reward }) => {
    const current = get();
    if (current.rewardedMatchIds.includes(matchId)) {
      return false;
    }

    const entry: MatchHistoryEntry = {
      matchId,
      dateIso: new Date().toISOString(),
      won,
      winnerName,
      rounds,
      pointsEarned: reward.total,
    };

    const next: PersistedProfileData = {
      ...extractPersisted(current),
      points: current.points + reward.total,
      stats: {
        matchesPlayed: current.stats.matchesPlayed + 1,
        wins: current.stats.wins + (won ? 1 : 0),
        losses: current.stats.losses + (won ? 0 : 1),
        totalPointsEarned: current.stats.totalPointsEarned + reward.total,
      },
      history: [entry, ...current.history].slice(0, 10),
      rewardedMatchIds: [...current.rewardedMatchIds, matchId].slice(-50),
    };
    saveProfile(next);
    set(next);
    return true;
  },

  claimTutorialReward: () => {
    const current = get();
    if (current.tutorialRewardClaimed) return false;

    const next: PersistedProfileData = {
      ...extractPersisted(current),
      points: current.points + TUTORIAL_GRADUATION_REWARD,
      stats: {
        ...current.stats,
        totalPointsEarned:
          current.stats.totalPointsEarned + TUTORIAL_GRADUATION_REWARD,
      },
      tutorialRewardClaimed: true,
    };
    saveProfile(next);
    set(next);
    return true;
  },

  resetProfile: () => {
    const fresh: PersistedProfileData = {
      ...DEFAULT_PROFILE_DATA,
      ownedItems: [...DEFAULT_OWNED_ITEMS],
      history: [],
      rewardedMatchIds: [],
      tutorialRewardClaimed: false,
    };
    saveProfile(fresh);
    set(fresh);
  },
}));
