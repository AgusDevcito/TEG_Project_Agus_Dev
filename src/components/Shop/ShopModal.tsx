import { useState } from 'react';
import { playSound } from '../../game/audio/soundEngine.ts';
import {
  SHOP_CATALOG,
  type CosmeticCategory,
  type CosmeticItem,
} from '../../game/shop/catalog.ts';
import { useProfileStore } from '../../stores/profileStore.ts';

interface ShopModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_TABS: { id: CosmeticCategory; label: string }[] = [
  { id: 'piece', label: '♟️ Fichas 3D' },
  { id: 'map', label: '🗺️ Mapas 3D' },
  { id: 'card', label: '🃏 Tarjetas' },
];

export function ShopModal({ open, onClose }: ShopModalProps) {
  const { points, ownedItems, equipped, buyItem, equipItem } = useProfileStore();
  const [category, setCategory] = useState<CosmeticCategory>('piece');
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(
    null,
  );

  if (!open) return null;

  const items = SHOP_CATALOG.filter((item) => item.category === category);

  const isEquipped = (item: CosmeticItem): boolean => {
    if (item.category === 'piece') return equipped.piece === item.id;
    if (item.category === 'map') return equipped.map === item.id;
    return equipped.card === item.id;
  };

  const handleAction = (item: CosmeticItem) => {
    const owned = ownedItems.includes(item.id);
    if (owned) {
      const res = equipItem(item.id);
      if (res.ok) {
        playSound('select');
        setFeedback({ text: `Equipaste "${item.name}".`, isError: false });
      }
      return;
    }

    const res = buyItem(item.id);
    if (res.ok) {
      playSound('conquest');
      setFeedback({
        text: `¡Compraste y equipaste "${item.name}"!`,
        isError: false,
      });
    } else {
      playSound('error');
      setFeedback({
        text: res.error ?? 'No se pudo completar la compra.',
        isError: true,
      });
    }
  };

  return (
    <div className="hud-modal" onClick={onClose}>
      <div
        className="hud-panel shop-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Tienda de cosméticos"
      >
        <div className="settings-modal__header">
          <div>
            <h2 className="settings-modal__title">🛒 Tienda de Cosméticos</h2>
            <div className="shop-subtitle">
              Ganá puntos jugando partidas y personalizá tu tablero 3D, fichas y tarjetas.
            </div>
          </div>
          <div className="shop-header-right">
            <div className="points-pill">🪙 {points} pts</div>
            <button className="btn btn--ghost" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </div>

        <div className="segmented">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`btn${category === tab.id ? ' btn--primary' : ''}`}
              onClick={() => {
                setCategory(tab.id);
                setFeedback(null);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`shop-feedback${feedback.isError ? ' shop-feedback--error' : ''}`}
          >
            {feedback.text}
          </div>
        )}

        <div className="shop-grid">
          {items.map((item) => {
            const owned = ownedItems.includes(item.id);
            const active = isEquipped(item);
            const canAfford = points >= item.price;

            return (
              <div
                key={item.id}
                className={`shop-item${active ? ' shop-item--equipped' : ''}`}
              >
                <div
                  className="shop-item__preview"
                  style={{
                    background: `linear-gradient(135deg, ${item.previewColors[0]}, ${item.previewColors[1]})`,
                    borderColor: item.previewColors[2],
                  }}
                >
                  <span className="shop-item__icon">{item.icon}</span>
                  {active && <span className="shop-item__badge">Equipado</span>}
                </div>

                <div className="shop-item__info">
                  <div className="shop-item__name">{item.name}</div>
                  <div className="shop-item__desc">{item.description}</div>
                </div>

                <button
                  className={`btn ${active ? 'btn--ghost' : owned || canAfford ? 'btn--primary' : ''}`}
                  disabled={active || (!owned && !canAfford)}
                  onClick={() => handleAction(item)}
                >
                  {active
                    ? '✓ Equipado'
                    : owned
                      ? 'Equipar'
                      : `Comprar · 🪙 ${item.price}`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="settings-modal__footer">
          <span className="shop-footer-note">
            Los estilos de mapa se previsualizan en tiempo real en el tablero 3D.
          </span>
          <button className="btn btn--primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
