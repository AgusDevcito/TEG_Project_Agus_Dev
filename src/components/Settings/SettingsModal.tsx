import { playSound } from '../../game/audio/soundEngine.ts';
import { SHOP_CATALOG, type MapSkinId } from '../../game/shop/catalog.ts';
import { useProfileStore } from '../../stores/profileStore.ts';
import {
  useSettingsStore,
  type BotDifficulty,
  type BotSpeed,
  type GraphicsQuality,
} from '../../stores/settingsStore.ts';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenShop: () => void;
}

const QUALITY_OPTIONS: { value: GraphicsQuality; label: string; desc: string }[] = [
  { value: 'low', label: 'Baja', desc: 'Sin sombras, ideal para PCs modestas' },
  { value: 'medium', label: 'Media', desc: 'Sombras estándar y DPR 1.5' },
  { value: 'high', label: 'Alta', desc: 'Sombras HD y nitidez máxima' },
];

const BOT_SPEED_OPTIONS: { value: BotSpeed; label: string }[] = [
  { value: 'slow', label: 'Lento' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Rápido' },
];

const BOT_DIFFICULTY_OPTIONS: { value: BotDifficulty; label: string; desc: string }[] = [
  { value: 'easy', label: 'Fácil', desc: 'Refuerzos dispersos y ataques moderados (máx. 3 por turno)' },
  { value: 'normal', label: 'Normal', desc: 'Concentra tropas y busca continentes' },
  { value: 'hard', label: 'Difícil', desc: 'Rompe continentes rivales y persigue su objetivo secreto' },
];

export function SettingsModal({ open, onClose, onOpenShop }: SettingsModalProps) {
  const settings = useSettingsStore();
  const { ownedItems, equipped, equipItem } = useProfileStore();

  if (!open) return null;

  const ownedMaps = SHOP_CATALOG.filter(
    (item) => item.category === 'map' && ownedItems.includes(item.id),
  );

  return (
    <div className="hud-modal" onClick={onClose}>
      <div
        className="hud-panel settings-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Configuración del juego"
      >
        <div className="settings-modal__header">
          <h2 className="settings-modal__title">⚙️ Configuración</h2>
          <button className="btn btn--ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="settings-modal__body">
          {/* Audio */}
          <section className="settings-section">
            <h3 className="settings-section__title">Audio</h3>
            <label className="settings-row">
              <span>Efectos de sonido</span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => {
                  settings.updateSettings({ soundEnabled: e.target.checked });
                  if (e.target.checked) playSound('select');
                }}
              />
            </label>
            <label className="settings-row">
              <span>Volumen ({Math.round(settings.masterVolume * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.masterVolume}
                disabled={!settings.soundEnabled}
                onChange={(e) =>
                  settings.updateSettings({ masterVolume: Number(e.target.value) })
                }
                onMouseUp={() => playSound('select')}
              />
            </label>
          </section>

          {/* Gráficos */}
          <section className="settings-section">
            <h3 className="settings-section__title">Gráficos y Tablero</h3>

            <div className="settings-field">
              <span className="settings-field__label">Calidad gráfica</span>
              <div className="segmented">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`btn${settings.graphicsQuality === opt.value ? ' btn--primary' : ''}`}
                    title={opt.desc}
                    onClick={() => settings.updateSettings({ graphicsQuality: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-field">
              <div className="settings-field__head">
                <span className="settings-field__label">Estilo de mapa desbloqueado</span>
                <button className="btn btn--tiny btn--ghost" onClick={onOpenShop}>
                  🛒 Ver más en Tienda
                </button>
              </div>
              <div className="title-grid">
                {ownedMaps.map((mapItem) => (
                  <button
                    key={mapItem.id}
                    className={`btn btn--tiny${equipped.map === (mapItem.id as MapSkinId) ? ' btn--primary' : ''}`}
                    onClick={() => {
                      equipItem(mapItem.id);
                      playSound('select');
                    }}
                  >
                    {mapItem.icon} {mapItem.name}
                  </button>
                ))}
              </div>
            </div>

            <label className="settings-row">
              <span>Mostrar árboles decorativos</span>
              <input
                type="checkbox"
                checked={settings.showTrees}
                onChange={(e) => settings.updateSettings({ showTrees: e.target.checked })}
              />
            </label>

            <label className="settings-row">
              <span>Mostrar rutas marítimas</span>
              <input
                type="checkbox"
                checked={settings.showSeaRoutes}
                onChange={(e) => settings.updateSettings({ showSeaRoutes: e.target.checked })}
              />
            </label>

            <label className="settings-row">
              <span>Mostrar siempre el nombre de los países</span>
              <input
                type="checkbox"
                checked={settings.showAllNames}
                onChange={(e) => settings.updateSettings({ showAllNames: e.target.checked })}
              />
            </label>
          </section>

          {/* Jugabilidad */}
          <section className="settings-section">
            <h3 className="settings-section__title">Jugabilidad y Cámara</h3>

            <div className="settings-field">
              <span className="settings-field__label">Dificultad de los Bots</span>
              <div className="segmented">
                {BOT_DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`btn${settings.botDifficulty === opt.value ? ' btn--primary' : ''}`}
                    title={opt.desc}
                    onClick={() => settings.updateSettings({ botDifficulty: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-field">
              <span className="settings-field__label">Velocidad de los Bots</span>
              <div className="segmented">
                {BOT_SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`btn${settings.botSpeed === opt.value ? ' btn--primary' : ''}`}
                    onClick={() => settings.updateSettings({ botSpeed: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="settings-row">
              <span>Sensibilidad de cámara ({settings.cameraSensitivity.toFixed(1)}x)</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={settings.cameraSensitivity}
                onChange={(e) =>
                  settings.updateSettings({ cameraSensitivity: Number(e.target.value) })
                }
              />
            </label>

            <label className="settings-row">
              <span>Confirmar antes de terminar fase/turno</span>
              <input
                type="checkbox"
                checked={settings.confirmEndTurn}
                onChange={(e) =>
                  settings.updateSettings({ confirmEndTurn: e.target.checked })
                }
              />
            </label>
          </section>
        </div>

        <div className="settings-modal__footer">
          <button
            className="btn btn--ghost"
            onClick={() => {
              settings.resetSettings();
              playSound('select');
            }}
          >
            Restablecer valores
          </button>
          <button className="btn btn--primary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
