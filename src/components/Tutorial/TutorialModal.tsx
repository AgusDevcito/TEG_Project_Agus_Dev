import { useState } from 'react';
import { playSound } from '../../game/audio/soundEngine.ts';
import {
  PLATFORM_GUIDE_SLIDES,
  TUTORIAL_GRADUATION_REWARD,
} from '../../game/tutorial/tutorialData.ts';
import { useProfileStore } from '../../stores/profileStore.ts';
import { useTutorialStore } from '../../stores/tutorialStore.ts';

interface TutorialModalProps {
  open: boolean;
  inActiveMatch: boolean;
  onClose: () => void;
  onStartGuidedMatch: () => void;
}

function TutorialModalContent({
  inActiveMatch,
  onClose,
  onStartGuidedMatch,
}: Omit<TutorialModalProps, 'open'>) {
  const [slideIdx, setSlideIdx] = useState(0);
  const { completedGuidedMatch, markPlatformTourDone } = useTutorialStore();
  const tutorialRewardClaimed = useProfileStore((s) => s.tutorialRewardClaimed);

  const slide = PLATFORM_GUIDE_SLIDES[slideIdx];
  const isFirst = slideIdx === 0;
  const isLast = slideIdx === PLATFORM_GUIDE_SLIDES.length - 1;

  const goTo = (next: number) => {
    setSlideIdx(next);
    playSound('select');
    if (next === PLATFORM_GUIDE_SLIDES.length - 1) {
      markPlatformTourDone();
    }
  };

  const handleStartPractice = () => {
    markPlatformTourDone();
    playSound('turn');
    onStartGuidedMatch();
  };

  return (
    <div className="hud-modal" onClick={onClose}>
      <div
        className="hud-panel tutorial-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Tutorial interactivo de TEG 3D"
      >
        <div className="settings-modal__header">
          <div>
            <h2 className="settings-modal__title">🎓 Guía de la Plataforma</h2>
            <div className="shop-subtitle">
              Paso {slideIdx + 1} de {PLATFORM_GUIDE_SLIDES.length}
              {completedGuidedMatch ? ' · ✓ Práctica guiada completada' : ''}
            </div>
          </div>
          <button className="btn btn--ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Barra de progreso clickeable */}
        <div className="tutorial-dots" role="tablist" aria-label="Pasos del tutorial">
          {PLATFORM_GUIDE_SLIDES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className={`tutorial-dot${idx === slideIdx ? ' tutorial-dot--active' : ''}${idx < slideIdx ? ' tutorial-dot--done' : ''}`}
              onClick={() => goTo(idx)}
              title={s.title}
            >
              {s.icon}
            </button>
          ))}
        </div>

        <div className="tutorial-card">
          <div className="tutorial-card__head">
            <span className="tutorial-card__icon">{slide.icon}</span>
            <div>
              <h3 className="tutorial-card__title">{slide.title}</h3>
              <p className="tutorial-card__subtitle">{slide.subtitle}</p>
            </div>
          </div>

          <ul className="tutorial-bullets">
            {slide.bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>

          <div className="tutorial-tip">
            <strong>💡 Consejo:</strong> {slide.tip}
          </div>
        </div>

        <div className="tutorial-practice-banner">
          <div>
            <div className="tutorial-practice-banner__title">
              🎮 Práctica Guiada en el Tablero 3D
            </div>
            <div className="tutorial-practice-banner__desc">
              Jugá un turno completo 1 vs Bot con un instructor interactivo paso a paso.
              {!tutorialRewardClaimed && (
                <span className="tutorial-reward-tag">
                  {' '}
                  🪙 +{TUTORIAL_GRADUATION_REWARD} pts al completar
                </span>
              )}
            </div>
          </div>
          <button className="btn btn--primary" onClick={handleStartPractice}>
            {inActiveMatch ? 'Reiniciar en modo guiado' : 'Iniciar práctica'}
          </button>
        </div>

        <div className="settings-modal__footer">
          <button
            className="btn btn--ghost"
            disabled={isFirst}
            onClick={() => goTo(slideIdx - 1)}
          >
            ← Anterior
          </button>

          <div className="profile-footer-right">
            {isLast ? (
              <button
                className="btn btn--primary"
                onClick={() => {
                  markPlatformTourDone();
                  onClose();
                }}
              >
                Entendido
              </button>
            ) : (
              <button className="btn btn--primary" onClick={() => goTo(slideIdx + 1)}>
                Siguiente →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TutorialModal(props: TutorialModalProps) {
  if (!props.open) return null;
  return (
    <TutorialModalContent
      inActiveMatch={props.inActiveMatch}
      onClose={props.onClose}
      onStartGuidedMatch={props.onStartGuidedMatch}
    />
  );
}
