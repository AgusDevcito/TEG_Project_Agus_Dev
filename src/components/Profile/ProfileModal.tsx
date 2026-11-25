import { useState } from 'react';
import { playSound } from '../../game/audio/soundEngine.ts';
import {
  PROFILE_AVATARS,
  PROFILE_TITLES,
  SHOP_ITEM_MAP,
} from '../../game/shop/catalog.ts';
import { PLAYER_COLOR_HEX, PLAYER_COLOR_LABEL } from '../../scenes/colors.ts';
import { useProfileStore } from '../../stores/profileStore.ts';
import { PLAYER_COLORS, type PlayerColor } from '../../types/game.ts';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onOpenShop: () => void;
}

function ProfileModalContent({
  onClose,
  onOpenShop,
}: Omit<ProfileModalProps, 'open'>) {
  const {
    registered,
    profile,
    points,
    stats,
    equipped,
    history,
    saveProfileInfo,
  } = useProfileStore();

  const [username, setUsername] = useState(profile.username);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [favoriteColor, setFavoriteColor] = useState<PlayerColor>(
    profile.favoriteColor,
  );
  const [title, setTitle] = useState(profile.title);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const winRate =
    stats.matchesPlayed > 0
      ? Math.round((stats.wins / stats.matchesPlayed) * 100)
      : 0;

  const handleSave = () => {
    saveProfileInfo({ username, avatar, favoriteColor, title });
    playSound('card');
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1800);
  };

  return (
    <div className="hud-modal" onClick={onClose}>
      <div
        className="hud-panel profile-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Perfil de jugador"
      >
        <div className="settings-modal__header">
          <h2 className="settings-modal__title">
            {registered ? '👤 Perfil de Jugador' : '👤 Registrar Perfil'}
          </h2>
          <button className="btn btn--ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="profile-banner">
          <div
            className="profile-avatar-preview"
            style={{ borderColor: PLAYER_COLOR_HEX[favoriteColor] }}
          >
            {avatar}
          </div>
          <div className="profile-banner__info">
            <div className="profile-banner__name">{username.trim() || 'Comandante'}</div>
            <div className="profile-banner__meta">
              {title} · Color favorito: {PLAYER_COLOR_LABEL[favoriteColor]}
            </div>
          </div>
          <div className="points-pill" title="Puntos disponibles para la tienda">
            🪙 {points} pts
          </div>
        </div>

        <div className="settings-modal__body">
          <section className="settings-section">
            <h3 className="settings-section__title">Identidad</h3>

            <label className="settings-field">
              <span className="settings-field__label">Nombre de jugador</span>
              <input
                className="quickstart__input"
                value={username}
                maxLength={18}
                placeholder="Tu nombre en el tablero"
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <div className="settings-field">
              <span className="settings-field__label">Avatar</span>
              <div className="avatar-grid">
                {PROFILE_AVATARS.map((emblem) => (
                  <button
                    key={emblem}
                    type="button"
                    className={`btn avatar-btn${avatar === emblem ? ' btn--primary' : ''}`}
                    onClick={() => {
                      setAvatar(emblem);
                      playSound('select');
                    }}
                  >
                    {emblem}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-field">
              <span className="settings-field__label">Color favorito de ejército</span>
              <div className="color-row">
                {PLAYER_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-choice${favoriteColor === color ? ' color-choice--active' : ''}`}
                    style={{ background: PLAYER_COLOR_HEX[color] }}
                    title={PLAYER_COLOR_LABEL[color]}
                    onClick={() => {
                      setFavoriteColor(color);
                      playSound('select');
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="settings-field">
              <span className="settings-field__label">Título</span>
              <div className="title-grid">
                {PROFILE_TITLES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`btn btn--tiny${title === t ? ' btn--primary' : ''}`}
                    onClick={() => {
                      setTitle(t);
                      playSound('select');
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-section__title">Estadísticas y Equipamiento</h3>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-box__val">{stats.matchesPlayed}</div>
                <div className="stat-box__label">Partidas</div>
              </div>
              <div className="stat-box">
                <div className="stat-box__val">{stats.wins}</div>
                <div className="stat-box__label">Victorias</div>
              </div>
              <div className="stat-box">
                <div className="stat-box__val">{winRate}%</div>
                <div className="stat-box__label">Efectividad</div>
              </div>
              <div className="stat-box">
                <div className="stat-box__val">{stats.totalPointsEarned}</div>
                <div className="stat-box__label">Pts ganados</div>
              </div>
            </div>

            <div className="equipped-summary">
              <span>♟️ {SHOP_ITEM_MAP[equipped.piece].name}</span>
              <span>🗺️ {SHOP_ITEM_MAP[equipped.map].name}</span>
              <span>🃏 {SHOP_ITEM_MAP[equipped.card].name}</span>
            </div>
          </section>

          {history.length > 0 && (
            <section className="settings-section">
              <h3 className="settings-section__title">Historial reciente</h3>
              <div className="history-list">
                {history.slice(0, 5).map((item) => (
                  <div key={item.matchId} className="history-row">
                    <span>{item.won ? '🏆 Victoria' : '⚔️ Derrota'}</span>
                    <span className="history-row__mid">
                      Rondas: {item.rounds} · Ganó {item.winnerName}
                    </span>
                    <span className="history-row__pts">+{item.pointsEarned} pts</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="settings-modal__footer">
          <button
            className="btn"
            onClick={() => {
              onClose();
              onOpenShop();
            }}
          >
            🛒 Ir a la Tienda
          </button>
          <div className="profile-footer-right">
            {savedFeedback && <span className="saved-badge">✓ Guardado</span>}
            <button className="btn btn--primary" onClick={handleSave}>
              {registered ? 'Guardar cambios' : 'Registrar perfil'}
            </button>
            <button className="btn btn--ghost" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileModal(props: ProfileModalProps) {
  if (!props.open) return null;
  return <ProfileModalContent onClose={props.onClose} onOpenShop={props.onOpenShop} />;
}
