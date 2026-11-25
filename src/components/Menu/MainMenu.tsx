import { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../game/index.ts';
import { TUTORIAL_GRADUATION_REWARD } from '../../game/tutorial/tutorialData.ts';
import { PLAYER_COLOR_HEX, PLAYER_COLOR_LABEL } from '../../scenes/colors.ts';
import { useGameStore } from '../../stores/gameStore.ts';
import { useProfileStore } from '../../stores/profileStore.ts';
import { useSettingsStore, type BotDifficulty } from '../../stores/settingsStore.ts';
import { useTutorialStore } from '../../stores/tutorialStore.ts';
import { PLAYER_COLORS, type PlayerColor, type PlayerConfig } from '../../types/game.ts';

interface MainMenuProps {
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenShop: () => void;
  onOpenTutorial: () => void;
}

type MenuView = 'home' | 'local_setup';

interface DraftPlayer {
  name: string;
  color: PlayerColor;
  isBot: boolean;
}

function buildInitialDrafts(
  username: string,
  favoriteColor: PlayerColor,
): DraftPlayer[] {
  const remainingColors = PLAYER_COLORS.filter((c) => c !== favoriteColor);
  const orderedColors: PlayerColor[] = [favoriteColor, ...remainingColors];

  return [
    { name: username || 'Jugador 1', color: orderedColors[0], isBot: false },
    { name: 'Bot Estratega', color: orderedColors[1], isBot: true },
    { name: 'Bot Conquistador', color: orderedColors[2], isBot: true },
    { name: 'Bot Almirante', color: orderedColors[3], isBot: true },
    { name: 'Bot Mariscal', color: orderedColors[4], isBot: true },
    { name: 'Bot Imperial', color: orderedColors[5], isBot: true },
  ];
}

export function MainMenu({
  onOpenSettings,
  onOpenProfile,
  onOpenShop,
  onOpenTutorial,
}: MainMenuProps) {
  const newGame = useGameStore((s) => s.newGame);
  const botDifficulty = useSettingsStore((s) => s.botDifficulty);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const stopGuidedPractice = useTutorialStore((s) => s.stopGuidedPractice);
  const completedGuidedMatch = useTutorialStore((s) => s.completedGuidedMatch);
  const { registered, profile, points, tutorialRewardClaimed } = useProfileStore();
  const [view, setView] = useState<MenuView>('home');
  const [playerCount, setPlayerCount] = useState(3);
  const [drafts, setDrafts] = useState<DraftPlayer[]>(() =>
    buildInitialDrafts(profile.username, profile.favoriteColor),
  );

  const openLocalSetup = () => {
    setDrafts(buildInitialDrafts(profile.username, profile.favoriteColor));
    setView('local_setup');
  };

  const cycleColor = (index: number) => {
    setDrafts((prev) => {
      const active = prev.slice(0, playerCount);
      const currentColor = prev[index].color;
      const startIdx = PLAYER_COLORS.indexOf(currentColor);
      const nextColor = PLAYER_COLORS[(startIdx + 1) % PLAYER_COLORS.length];

      const swapIdx = active.findIndex((p, i) => i !== index && p.color === nextColor);
      return prev.map((p, i) => {
        if (i === index) return { ...p, color: nextColor };
        if (i === swapIdx) return { ...p, color: currentColor };
        return p;
      });
    });
  };

  const toggleBot = (index: number) => {
    setDrafts((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const nextIsBot = !p.isBot;
        const defaultName = nextIsBot
          ? `Bot ${i + 1}`
          : i === 0
            ? profile.username
            : `Jugador ${i + 1}`;
        const isGeneric = p.name.startsWith('Jugador ') || p.name.startsWith('Bot ');
        return {
          ...p,
          isBot: nextIsBot,
          name: isGeneric ? defaultName : p.name,
        };
      }),
    );
  };

  const startLocalGame = () => {
    stopGuidedPractice();
    const players: PlayerConfig[] = drafts.slice(0, playerCount).map((d, i) => ({
      id: `p${i + 1}`,
      name: d.name.trim() || (d.isBot ? `Bot ${i + 1}` : `Jugador ${i + 1}`),
      color: d.color,
      isBot: d.isBot,
    }));
    newGame(players);
  };

  return (
    <div className="menu-overlay">
      {view === 'home' ? (
        <div className="hud-panel menu-card">
          {/* Barra compacta de perfil y puntos */}
          <div className="menu-profile-bar" onClick={onOpenProfile} role="button" tabIndex={0}>
            <div
              className="menu-profile-bar__avatar"
              style={{ borderColor: PLAYER_COLOR_HEX[profile.favoriteColor] }}
            >
              {profile.avatar}
            </div>
            <div className="menu-profile-bar__info">
              <div className="menu-profile-bar__name">{profile.username}</div>
              <div className="menu-profile-bar__sub">
                {registered ? profile.title : 'Tocá para registrar tu perfil'}
              </div>
            </div>
            <div className="points-pill">🪙 {points}</div>
          </div>

          <h1 className="menu-title">T.E.G.</h1>
          <p className="menu-subtitle">Táctica y Estrategia de la Guerra</p>

          <div className="menu-actions">
            <button className="btn btn--primary btn--lg" onClick={openLocalSetup}>
              ⚔️ Partida Local / vs Bots
            </button>

            <div className="menu-row-2">
              <button className="btn" onClick={onOpenProfile}>
                👤 {registered ? 'Mi Perfil' : 'Crear Perfil'}
              </button>
              <button className="btn" onClick={onOpenShop}>
                🛒 Tienda
              </button>
            </div>

            <button className="btn menu-upcoming__btn" onClick={onOpenTutorial}>
              <span>🎓 Tutorial Interactivo</span>
              {completedGuidedMatch ? (
                <span className="pill pill--done">✓ Completado</span>
              ) : !tutorialRewardClaimed ? (
                <span className="pill pill--gold">🪙 +{TUTORIAL_GRADUATION_REWARD} pts</span>
              ) : null}
            </button>

            <button className="btn btn--lg" onClick={onOpenSettings}>
              ⚙️ Configuración
            </button>

            <div className="menu-divider">Próxima etapa</div>

            <div className="menu-upcoming">
              <button className="btn menu-upcoming__btn" disabled title="Disponible en Etapa 6">
                🌐 Salas Online (2–6 jugadores)
                <span className="pill">Etapa 6</span>
              </button>
            </div>
          </div>

          <p className="menu-hint">
            50 países · 6 continentes · 15 objetivos secretos · Cosméticos 3D
          </p>
        </div>
      ) : (
        <div className="hud-panel menu-card menu-card--wide">
          <div className="menu-setup__header">
            <button className="btn btn--ghost" onClick={() => setView('home')}>
              ← Volver
            </button>
            <h2 className="menu-setup__title">Configurar partida local</h2>
            <button className="btn btn--ghost" onClick={onOpenSettings} title="Configuración">
              ⚙️
            </button>
          </div>

          <div className="settings-field">
            <span className="settings-field__label">Cantidad de jugadores (2 a 6)</span>
            <div className="segmented">
              {Array.from(
                { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
                (_, i) => i + MIN_PLAYERS,
              ).map((n) => (
                <button
                  key={n}
                  className={`btn${n === playerCount ? ' btn--primary' : ''}`}
                  onClick={() => setPlayerCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-players">
            {drafts.slice(0, playerCount).map((draft, i) => (
              <div key={i} className="setup-player">
                <button
                  className="color-picker-btn"
                  style={{ background: PLAYER_COLOR_HEX[draft.color] }}
                  title={`Color: ${PLAYER_COLOR_LABEL[draft.color]} (click para cambiar)`}
                  onClick={() => cycleColor(i)}
                  aria-label={`Cambiar color de ${draft.name}`}
                />
                <input
                  className="quickstart__input"
                  value={draft.name}
                  maxLength={18}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((p, idx) =>
                        idx === i ? { ...p, name: e.target.value } : p,
                      ),
                    )
                  }
                />
                <button
                  className={`btn setup-player__type${draft.isBot ? ' setup-player__type--bot' : ''}`}
                  onClick={() => toggleBot(i)}
                  title="Alternar entre jugador humano y bot"
                >
                  {draft.isBot ? '🤖 Bot' : '👤 Humano'}
                </button>
              </div>
            ))}
          </div>

          <div className="settings-field">
            <span className="settings-field__label">Dificultad de los Bots</span>
            <div className="segmented">
              {(
                [
                  { value: 'easy', label: 'Fácil' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'hard', label: 'Difícil' },
                ] as { value: BotDifficulty; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  className={`btn btn--tiny${botDifficulty === opt.value ? ' btn--primary' : ''}`}
                  onClick={() => updateSettings({ botDifficulty: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn--primary btn--lg" onClick={startLocalGame}>
            Comenzar partida
          </button>

          <p className="menu-hint">
            {playerCount === 2
              ? 'Modo Duelo 1 vs 1: ganás al ocupar 40 países o eliminar al rival.'
              : 'Modo Clásico (3–6): ganás al cumplir tu Objetivo Secreto u ocupar 30 países.'}
          </p>
        </div>
      )}
    </div>
  );
}
