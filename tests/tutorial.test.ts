import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialGameState, endPhase, getCurrentPlayer, placeArmies } from '../src/game/index.ts';
import {
  evaluateGuidedStepIndex,
  GUIDED_STEPS,
  PLATFORM_GUIDE_SLIDES,
  TUTORIAL_GRADUATION_REWARD,
} from '../src/game/tutorial/tutorialData.ts';
import { WELCOME_BONUS_POINTS } from '../src/game/shop/catalog.ts';
import { useProfileStore } from '../src/stores/profileStore.ts';
import { useTutorialStore } from '../src/stores/tutorialStore.ts';

function deterministicRng(): () => number {
  let s = 17;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('Tutorial Interactivo y Recompensa', () => {
  beforeEach(() => {
    useProfileStore.getState().resetProfile();
    useTutorialStore.getState().resetTutorial();
  });

  it('provee diapositivas de la plataforma y pasos guiados en partida', () => {
    expect(PLATFORM_GUIDE_SLIDES.length).toBeGreaterThanOrEqual(5);
    expect(GUIDED_STEPS).toHaveLength(6);
  });

  it('avanza automáticamente los pasos guiados según las acciones del jugador humano', () => {
    const rng = deterministicRng();
    let state = createInitialGameState(
      [
        { id: 'p1', name: 'Jugador', color: 'red', isBot: false },
        { id: 'bot', name: 'Bot Instructor', color: 'blue', isBot: true },
      ],
      rng,
    );

    // En incorporación inicial sigue en paso 0
    let step = evaluateGuidedStepIndex({
      currentStepIndex: 0,
      game: state,
      selectedId: null,
      combatSeq: 0,
    });
    expect(step).toBe(0);

    // Completar incorporaciones iniciales hasta llegar a fase attack del humano
    while (
      state.phase === 'initial_placement_1' ||
      state.phase === 'initial_placement_2'
    ) {
      const current = getCurrentPlayer(state);
      const owned = Object.values(state.territories).find(
        (t) => t.ownerId === current.id,
      )!;
      state = placeArmies(state, owned.id, current.pendingArmies).state;
    }

    // Al entrar en fase attack -> paso 1 (elegir atacante)
    step = evaluateGuidedStepIndex({
      currentStepIndex: step,
      game: state,
      selectedId: null,
      combatSeq: 0,
    });
    expect(step).toBe(1);

    // Al seleccionar un país atacante -> paso 2 (atacar)
    step = evaluateGuidedStepIndex({
      currentStepIndex: step,
      game: state,
      selectedId: 'argentina',
      combatSeq: 0,
    });
    expect(step).toBe(2);

    // Al ejecutar un ataque (combatSeq > 0) -> paso 3 (conquista/fin ataques)
    step = evaluateGuidedStepIndex({
      currentStepIndex: step,
      game: state,
      selectedId: 'argentina',
      combatSeq: 1,
    });
    expect(step).toBe(3);

    // Al terminar ataques (entrar en regroup) -> paso 4 (reagrupar/terminar turno)
    state = endPhase(state, rng).state;
    step = evaluateGuidedStepIndex({
      currentStepIndex: step,
      game: state,
      selectedId: null,
      combatSeq: 1,
    });
    expect(step).toBe(4);

    // Al terminar turno (pasa al bot) -> paso 5 (completado!)
    state = endPhase(state, rng).state;
    step = evaluateGuidedStepIndex({
      currentStepIndex: step,
      game: state,
      selectedId: null,
      combatSeq: 1,
    });
    expect(step).toBe(5);
  });

  it('acredita la recompensa de graduación del tutorial una sola vez', () => {
    const first = useProfileStore.getState().claimTutorialReward();
    expect(first).toBe(true);
    expect(useProfileStore.getState().points).toBe(
      WELCOME_BONUS_POINTS + TUTORIAL_GRADUATION_REWARD,
    );

    const second = useProfileStore.getState().claimTutorialReward();
    expect(second).toBe(false);
    expect(useProfileStore.getState().points).toBe(
      WELCOME_BONUS_POINTS + TUTORIAL_GRADUATION_REWARD,
    );
  });
});
