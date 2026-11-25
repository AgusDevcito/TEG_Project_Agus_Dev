import { useEffect } from 'react';
import { playSound } from '../../game/audio/soundEngine.ts';
import {
  evaluateGuidedStepIndex,
  GUIDED_STEPS,
  TUTORIAL_GRADUATION_REWARD,
} from '../../game/tutorial/tutorialData.ts';
import { useGameStore } from '../../stores/gameStore.ts';
import { useProfileStore } from '../../stores/profileStore.ts';
import { useTutorialStore } from '../../stores/tutorialStore.ts';

interface GuidedOverlayProps {
  onOpenShop: () => void;
}

/**
 * Coach interactivo flotante durante la partida guiada.
 * Detecta el progreso real del jugador en el tablero 3D y avanza los pasos automáticamente.
 */
export function GuidedOverlay({ onOpenShop }: GuidedOverlayProps) {
  const game = useGameStore((s) => s.game);
  const selectedId = useGameStore((s) => s.selectedId);
  const combatSeq = useGameStore((s) => s.combatSeq);

  const guidedActive = useTutorialStore((s) => s.guidedActive);
  const guidedStepIndex = useTutorialStore((s) => s.guidedStepIndex);
  const setGuidedStepIndex = useTutorialStore((s) => s.setGuidedStepIndex);
  const skipGuidedStep = useTutorialStore((s) => s.skipGuidedStep);
  const stopGuidedPractice = useTutorialStore((s) => s.stopGuidedPractice);

  const claimTutorialReward = useProfileStore((s) => s.claimTutorialReward);
  const tutorialRewardClaimed = useProfileStore((s) => s.tutorialRewardClaimed);

  useEffect(() => {
    if (!guidedActive || !game) return;
    const nextIdx = evaluateGuidedStepIndex({
      currentStepIndex: guidedStepIndex,
      game,
      selectedId,
      combatSeq,
    });
    if (nextIdx > guidedStepIndex) {
      setGuidedStepIndex(nextIdx);
      if (nextIdx === GUIDED_STEPS.length - 1) {
        claimTutorialReward();
        playSound('victory');
      } else {
        playSound('card');
      }
    }
  }, [
    guidedActive,
    game,
    selectedId,
    combatSeq,
    guidedStepIndex,
    setGuidedStepIndex,
    claimTutorialReward,
  ]);

  if (!guidedActive || !game || game.phase === 'game_over') return null;

  const step = GUIDED_STEPS[guidedStepIndex];
  const isCompleted = step.id === 'completed';
  const progressPct = Math.round((step.stepNumber / step.totalSteps) * 100);

  return (
    <div className="guided-coach">
      <div className="hud-panel guided-coach__box">
        <div className="guided-coach__top">
          <span className="guided-coach__badge">
            🎓 Instructor · Paso {step.stepNumber}/{step.totalSteps}
          </span>
          <div className="guided-coach__controls">
            {!isCompleted && (
              <button
                className="btn btn--tiny btn--ghost"
                onClick={() => {
                  const nextIdx = Math.min(GUIDED_STEPS.length - 1, guidedStepIndex + 1);
                  skipGuidedStep();
                  if (nextIdx === GUIDED_STEPS.length - 1) {
                    claimTutorialReward();
                    playSound('victory');
                  } else {
                    playSound('select');
                  }
                }}
              >
                Saltar paso →
              </button>
            )}
            <button
              className="btn btn--tiny btn--ghost"
              onClick={stopGuidedPractice}
              title="Cerrar guía y seguir jugando libremente"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="guided-progress">
          <div className="guided-progress__fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="guided-coach__title">{step.title}</div>
        <div className="guided-coach__text">{step.instruction}</div>
        <div className="guided-coach__hint">💡 {step.hint}</div>

        {isCompleted && (
          <div className="guided-coach__done">
            <span className="guided-coach__reward">
              {tutorialRewardClaimed
                ? `🏆 Graduado · Bonus de 🪙 +${TUTORIAL_GRADUATION_REWARD} pts acreditado`
                : `🪙 +${TUTORIAL_GRADUATION_REWARD} pts`}
            </span>
            <div className="guided-coach__done-actions">
              <button className="btn btn--tiny" onClick={onOpenShop}>
                🛒 Ir a la Tienda
              </button>
              <button className="btn btn--tiny btn--primary" onClick={stopGuidedPractice}>
                Seguir jugando
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
