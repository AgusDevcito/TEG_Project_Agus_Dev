import { beforeEach, describe, expect, it } from 'vitest';
import {
  calculateMatchReward,
  SHOP_CATALOG,
  WELCOME_BONUS_POINTS,
} from '../src/game/shop/catalog.ts';
import { useProfileStore } from '../src/stores/profileStore.ts';

describe('Perfil de jugador, Puntos y Tienda de Cosméticos', () => {
  beforeEach(() => {
    useProfileStore.getState().resetProfile();
  });

  it('inicia con puntos de bienvenida y cosméticos clásicos desbloqueados', () => {
    const state = useProfileStore.getState();
    expect(state.points).toBe(WELCOME_BONUS_POINTS);
    expect(state.ownedItems).toContain('piece_classic');
    expect(state.ownedItems).toContain('map_classic');
    expect(state.ownedItems).toContain('card_classic');
    expect(SHOP_CATALOG.length).toBeGreaterThanOrEqual(12);
  });

  it('permite registrar y personalizar el perfil del jugador', () => {
    useProfileStore.getState().saveProfileInfo({
      username: 'San Martín',
      avatar: '🦅',
      favoriteColor: 'blue',
      title: 'General',
    });

    const state = useProfileStore.getState();
    expect(state.registered).toBe(true);
    expect(state.profile.username).toBe('San Martín');
    expect(state.profile.avatar).toBe('🦅');
    expect(state.profile.favoriteColor).toBe('blue');
    expect(state.profile.title).toBe('General');
  });

  it('permite comprar y equipar un cosmético si hay puntos suficientes y bloquea si faltan puntos', () => {
    // 250 pts iniciales -> puede comprar piece_hex (150 pts)
    const buyOk = useProfileStore.getState().buyItem('piece_hex');
    expect(buyOk.ok).toBe(true);
    expect(useProfileStore.getState().points).toBe(100);
    expect(useProfileStore.getState().ownedItems).toContain('piece_hex');
    expect(useProfileStore.getState().equipped.piece).toBe('piece_hex');

    // Ahora con 100 pts no puede comprar map_volcanic (400 pts)
    const buyFail = useProfileStore.getState().buyItem('map_volcanic');
    expect(buyFail.ok).toBe(false);
    expect(useProfileStore.getState().equipped.map).toBe('map_classic');

    // No puede equipar algo que no compró
    const equipFail = useProfileStore.getState().equipItem('map_volcanic');
    expect(equipFail.ok).toBe(false);

    // Puede volver a equipar piece_classic
    const equipOk = useProfileStore.getState().equipItem('piece_classic');
    expect(equipOk.ok).toBe(true);
    expect(useProfileStore.getState().equipped.piece).toBe('piece_classic');
  });

  it('calcula recompensas por partida y las acredita una sola vez por matchId', () => {
    const reward = calculateMatchReward({
      won: true,
      winReason: 'secret_objective',
      territoriesOwned: 22,
      roundsPlayed: 6,
      humanParticipated: true,
    });

    // 50 participación + 200 victoria secreta + 66 países + 30 rondas = 346
    expect(reward.total).toBe(346);

    const first = useProfileStore.getState().recordMatchReward({
      matchId: 'match-1',
      won: true,
      winnerName: 'Comandante',
      rounds: 6,
      reward,
    });
    expect(first).toBe(true);
    expect(useProfileStore.getState().points).toBe(WELCOME_BONUS_POINTS + 346);
    expect(useProfileStore.getState().stats.wins).toBe(1);
    expect(useProfileStore.getState().history).toHaveLength(1);

    // Idempotencia: repetir el mismo matchId no duplica puntos
    const duplicate = useProfileStore.getState().recordMatchReward({
      matchId: 'match-1',
      won: true,
      winnerName: 'Comandante',
      rounds: 6,
      reward,
    });
    expect(duplicate).toBe(false);
    expect(useProfileStore.getState().points).toBe(WELCOME_BONUS_POINTS + 346);
  });
});
