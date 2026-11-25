import { create } from 'zustand';
import { GUIDED_STEPS } from '../game/tutorial/tutorialData.ts';

interface PersistedTutorialData {
  completedPlatformTour: boolean;
  completedGuidedMatch: boolean;
}

const STORAGE_KEY = 'teg_tutorial_v1';

const DEFAULT_DATA: PersistedTutorialData = {
  completedPlatformTour: false,
  completedGuidedMatch: false,
};

function loadTutorialData(): PersistedTutorialData {
  if (typeof window === 'undefined') return DEFAULT_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    return { ...DEFAULT_DATA, ...(JSON.parse(raw) as Partial<PersistedTutorialData>) };
  } catch {
    return DEFAULT_DATA;
  }
}

function saveTutorialData(data: PersistedTutorialData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

export interface TutorialStore extends PersistedTutorialData {
  guidedActive: boolean;
  guidedStepIndex: number;

  markPlatformTourDone: () => void;
  startGuidedPractice: () => void;
  setGuidedStepIndex: (index: number) => void;
  skipGuidedStep: () => void;
  stopGuidedPractice: () => void;
  resetTutorial: () => void;
}

const initial = loadTutorialData();

export const useTutorialStore = create<TutorialStore>((set, get) => ({
  ...initial,
  guidedActive: false,
  guidedStepIndex: 0,

  markPlatformTourDone: () => {
    const next: PersistedTutorialData = {
      completedPlatformTour: true,
      completedGuidedMatch: get().completedGuidedMatch,
    };
    saveTutorialData(next);
    set(next);
  },

  startGuidedPractice: () => {
    set({
      guidedActive: true,
      guidedStepIndex: 0,
    });
  },

  setGuidedStepIndex: (index) => {
    const clamped = Math.max(0, Math.min(GUIDED_STEPS.length - 1, index));
    const isCompleted = clamped === GUIDED_STEPS.length - 1;
    if (isCompleted && !get().completedGuidedMatch) {
      const next: PersistedTutorialData = {
        completedPlatformTour: get().completedPlatformTour,
        completedGuidedMatch: true,
      };
      saveTutorialData(next);
      set({ ...next, guidedStepIndex: clamped });
      return;
    }
    set({ guidedStepIndex: clamped });
  },

  skipGuidedStep: () => {
    const nextIdx = Math.min(GUIDED_STEPS.length - 1, get().guidedStepIndex + 1);
    get().setGuidedStepIndex(nextIdx);
  },

  stopGuidedPractice: () => {
    set({ guidedActive: false });
  },

  resetTutorial: () => {
    saveTutorialData(DEFAULT_DATA);
    set({ ...DEFAULT_DATA, guidedActive: false, guidedStepIndex: 0 });
  },
}));
