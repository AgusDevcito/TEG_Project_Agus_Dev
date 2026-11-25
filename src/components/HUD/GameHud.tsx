import { useEffect, useMemo, useState } from 'react';
import {
  CONTINENTS,
  getCommonObjectiveTarget,
  getContinentTerritories,
  getControlledContinents,
  getCurrentPlayer,
  getMaxAttackDice,
  getObjectiveById,
  getPlayerTerritoryCount,
  getTerritoryDefinition,
  getTotalPendingArmies,
  isValidCardTrade,
} from '../../game/index.ts';
import { calculateMatchReward } from '../../game/shop/catalog.ts';
import { PLAYER_COLOR_HEX, PLAYER_COLOR_LABEL } from '../../scenes/colors.ts';
import { useGameStore, type AttackDiceSelection } from '../../stores/gameStore.ts';
import { useProfileStore } from '../../stores/profileStore.ts';
import {
  BOT_DELAY_MS,
  useSettingsStore,
  type BotSpeed,
} from '../../stores/settingsStore.ts';
import { useTutorialStore } from '../../stores/tutorialStore.ts';
import type { ContinentId, GamePhase, GameState } from '../../types/game.ts';
import { GuidedOverlay } from '../Tutorial/GuidedOverlay.tsx';

interface GameHudProps {
  onOpenSettings: () => void;
  onOpenShop: () => void;
  onOpenTutorial: () => void;
}

const PHASE_LABEL: Record<GamePhase, string> = {
  initial_placement_1: 'Incorporación inicial (5)',
  initial_placement_2: 'Incorporación inicial (3)',
  reinforce: 'Refuerzos',
  attack: 'Ataque',
  conquest_move: 'Ocupación',
  regroup: 'Reagrupamiento',
  game_over: 'Fin de la partida',
};

const PHASE_HELP: Record<GamePhase, string> = {
  initial_placement_1: 'Click en tus países para colocar 1 ejército (Shift + Click coloca todos).',
  initial_placement_2: 'Click en tus países para colocar 1 ejército (Shift + Click coloca todos).',
  reinforce: 'Colocá tus refuerzos. Podés canjear tarjetas o cobrar bonus +2 antes de atacar.',
  attack: 'Elegí tu país origen (2+ ejércitos), elegí cuántos dados tirar y hacé click en un enemigo limítrofe.',
  conquest_move: 'Elegí cuántos ejércitos pasar al país conquistado.',
  regroup: 'Elegí un país propio y luego uno limítrofe propio para mover 1 ejército (Shift = máximo).',
  game_over: '¡La partida terminó!',
};

const SYMBOL_ICON = { galeon: '⛵', globo: '🎈', canon: '💣', comodin: '★' } as const;

const PHASE_STEPS: { key: 'reinforce' | 'attack' | 'regroup'; label: string }[] = [
  { key: 'reinforce', label: '1. Refuerzos' },
  { key: 'attack', label: '2. Ataque' },
  { key: 'regroup', label: '3. Reagrupar' },
];

function getActiveStep(phase: GamePhase): 'reinforce' | 'attack' | 'regroup' | null {
  if (
    phase === 'initial_placement_1' ||
    phase === 'initial_placement_2' ||
    phase === 'reinforce'
  ) {
    return 'reinforce';
  }
  if (phase === 'attack' || phase === 'conquest_move') return 'attack';
  if (phase === 'regroup') return 'regroup';
  return null;
}

function TopBar({
  game,
  showContinents,
  onToggleContinents,
  onOpenSettings,
  onOpenShop,
  onOpenTutorial,
}: {
  game: GameState;
  showContinents: boolean;
  onToggleContinents: () => void;
  onOpenSettings: () => void;
  onOpenShop: () => void;
  onOpenTutorial: () => void;
}) {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const points = useProfileStore((s) => s.points);
  const exitGame = useGameStore((s) => s.exitGame);
  const stopGuidedPractice = useTutorialStore((s) => s.stopGuidedPractice);
  const activeStep = getActiveStep(game.phase);

  return (
    <div className="hud-topbar">
      <div className="hud-panel hud-stepper">
        <span className="hud-stepper__round">Ronda {game.round}</span>
        {PHASE_STEPS.map((step) => (
          <span
            key={step.key}
            className={`hud-step${activeStep === step.key ? ' hud-step--active' : ''}`}
          >
            {step.label}
          </span>
        ))}
      </div>

      <div className="hud-topbar__tools">
        <button
          className={`btn${showContinents ? ' btn--primary' : ''}`}
          onClick={onToggleContinents}
          title="Ver bonus de continentes"
        >
          🗺️ Continentes
        </button>
        <button
          className="btn"
          onClick={onOpenShop}
          title="Abrir Tienda de Cosméticos"
        >
          🛒 🪙 {points}
        </button>
        <button
          className="btn"
          onClick={onOpenTutorial}
          title="Abrir Tutorial y Guía"
        >
          🎓
        </button>
        <button
          className="btn"
          onClick={toggleSound}
          title={soundEnabled ? 'Silenciar audio' : 'Activar audio'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
        <button className="btn" onClick={onOpenSettings} title="Configuración">
          ⚙️
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => {
            stopGuidedPractice();
            exitGame();
          }}
          title="Volver al menú principal"
        >
          Menú
        </button>
      </div>
    </div>
  );
}

function ContinentsPopover({ game }: { game: GameState }) {
  const ownerByContinent = new Map<ContinentId, string>();
  for (const player of game.players) {
    if (player.eliminated) continue;
    for (const cId of getControlledContinents(player.id, game.territories)) {
      ownerByContinent.set(cId, player.id);
    }
  }

  return (
    <div className="hud-panel hud-continents">
      <div className="hud-cards__title">Bonus por Continente</div>
      <div className="hud-continents__list">
        {(Object.keys(CONTINENTS) as ContinentId[]).map((cId) => {
          const cont = CONTINENTS[cId];
          const count = getContinentTerritories(cId).length;
          const ownerId = ownerByContinent.get(cId);
          const owner = ownerId ? game.players.find((p) => p.id === ownerId) : null;
          return (
            <div key={cId} className="hud-continent-row">
              <span className="hud-continent-row__name">
                {cont.name} <small>({count})</small>
              </span>
              <span className="hud-continent-row__bonus">+{cont.bonus}</span>
              {owner ? (
                <span
                  className="hud-swatch"
                  style={{ background: PLAYER_COLOR_HEX[owner.color] }}
                  title={`Controlado por ${owner.name}`}
                />
              ) : (
                <span className="hud-continent-row__none">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayersPanel({ game }: { game: GameState }) {
  return (
    <div className="hud-panel hud-players">
      {game.players.map((p, idx) => (
        <div
          key={p.id}
          className={`hud-player${idx === game.currentPlayerIndex ? ' hud-player--active' : ''}${p.eliminated ? ' hud-player--out' : ''}`}
        >
          <span className="hud-swatch" style={{ background: PLAYER_COLOR_HEX[p.color] }} />
          <span className="hud-player__name">
            {p.isBot ? '🤖 ' : ''}
            {p.name}
          </span>
          <span className="hud-player__stat" title="Países">
            🌍 {getPlayerTerritoryCount(p.id, game.territories)}
          </span>
          <span className="hud-player__stat" title="Tarjetas">
            🃏 {p.cards.length}
          </span>
        </div>
      ))}
    </div>
  );
}

function DiceSelector({ game }: { game: GameState }) {
  const selectedId = useGameStore((s) => s.selectedId);
  const attackDiceCount = useGameStore((s) => s.attackDiceCount);
  const setAttackDiceCount = useGameStore((s) => s.setAttackDiceCount);

  if (game.phase !== 'attack' || !selectedId) return null;

  const territory = game.territories[selectedId];
  const def = getTerritoryDefinition(selectedId);
  if (!territory || !def) return null;

  const maxDice = getMaxAttackDice(territory.armies);
  const options: { value: AttackDiceSelection; label: string; disabled: boolean }[] = [
    { value: null, label: `Máx (${maxDice})`, disabled: false },
    { value: 1, label: '1', disabled: maxDice < 1 },
    { value: 2, label: '2', disabled: maxDice < 2 },
    { value: 3, label: '3', disabled: maxDice < 3 },
  ];

  return (
    <div className="dice-selector">
      <div className="dice-selector__header">
        <span>
          Origen: <strong>{def.name}</strong> ({territory.armies} ej.)
        </span>
      </div>
      <div className="dice-selector__label">Dados para atacar:</div>
      <div className="segmented">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            className={`btn btn--tiny${attackDiceCount === opt.value ? ' btn--primary' : ''}`}
            disabled={opt.disabled}
            onClick={() => setAttackDiceCount(opt.value)}
          >
            🎲 {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BotControls() {
  const botsPaused = useGameStore((s) => s.botsPaused);
  const toggleBotsPaused = useGameStore((s) => s.toggleBotsPaused);
  const botSpeed = useSettingsStore((s) => s.botSpeed);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const speeds: { value: BotSpeed; label: string }[] = [
    { value: 'slow', label: '1x' },
    { value: 'normal', label: '2x' },
    { value: 'fast', label: '4x' },
  ];

  return (
    <div className="bot-controls">
      <div className="bot-controls__status">
        {botsPaused ? '⏸️ Bot en pausa' : '🤖 Jugando turno del bot...'}
      </div>
      <div className="bot-controls__row">
        <button className="btn btn--tiny" onClick={toggleBotsPaused}>
          {botsPaused ? '▶ Reanudar' : '⏸ Pausar'}
        </button>
        <div className="segmented">
          {speeds.map((s) => (
            <button
              key={s.value}
              className={`btn btn--tiny${botSpeed === s.value ? ' btn--primary' : ''}`}
              onClick={() => updateSettings({ botSpeed: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TurnPanel({ game }: { game: GameState }) {
  const player = getCurrentPlayer(game);
  const endPhase = useGameStore((s) => s.endPhase);
  const confirmEndTurn = useSettingsStore((s) => s.confirmEndTurn);
  const [showObjective, setShowObjective] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const pending = getTotalPendingArmies(player);
  const continentPools = Object.entries(player.pendingContinentArmies).filter(
    ([, n]) => (n ?? 0) > 0,
  );
  const objective = getObjectiveById(player.objectiveId);

  const canEnd = !player.isBot && (game.phase === 'attack' || game.phase === 'regroup');
  const endLabel = game.phase === 'attack' ? 'Terminar ataques' : 'Terminar turno';

  const handleEndClick = () => {
    if (confirmEndTurn && !confirmingEnd) {
      setConfirmingEnd(true);
      return;
    }
    setConfirmingEnd(false);
    endPhase();
  };

  return (
    <div className="hud-panel hud-turn">
      <div className="hud-turn__header">
        <span
          className="hud-swatch hud-swatch--lg"
          style={{ background: PLAYER_COLOR_HEX[player.color] }}
        />
        <div>
          <div className="hud-turn__player">
            {player.isBot ? '🤖 ' : ''}
            {player.name}
          </div>
          <div className="hud-turn__phase">{PHASE_LABEL[game.phase]}</div>
        </div>
      </div>

      {player.isBot ? (
        <BotControls />
      ) : (
        <>
          <p className="hud-turn__help">{PHASE_HELP[game.phase]}</p>

          {pending > 0 && (
            <div className="hud-turn__pending">
              Ejércitos por colocar: <strong>{player.pendingArmies}</strong>
              {continentPools.map(([cont, n]) => (
                <div key={cont} className="hud-turn__pool">
                  + {n} solo en {CONTINENTS[cont as ContinentId].name}
                </div>
              ))}
            </div>
          )}

          <DiceSelector game={game} />

          <div className="hud-turn__actions">
            {confirmingEnd ? (
              <>
                <button className="btn btn--primary" onClick={handleEndClick}>
                  ¿Confirmar?
                </button>
                <button className="btn" onClick={() => setConfirmingEnd(false)}>
                  Cancelar
                </button>
              </>
            ) : (
              <button className="btn btn--primary" disabled={!canEnd} onClick={handleEndClick}>
                {endLabel}
              </button>
            )}
            <button className="btn" onClick={() => setShowObjective((v) => !v)}>
              {showObjective ? 'Ocultar objetivo' : '🎯 Objetivo'}
            </button>
          </div>

          {showObjective && (
            <div className="hud-turn__objective">
              {game.players.length <= 2 ? (
                <>
                  🎯 Duelo 1 vs 1: ocupar{' '}
                  <strong>{getCommonObjectiveTarget(game.players.length)} países</strong> o
                  eliminar al ejército rival.
                </>
              ) : (
                <>
                  🎯 {objective?.description}
                  <div className="hud-turn__objective-common">
                    Objetivo común: ocupar {getCommonObjectiveTarget(game.players.length)}{' '}
                    países.
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CardsPanel({ game }: { game: GameState }) {
  const player = getCurrentPlayer(game);
  const tradeCards = useGameStore((s) => s.tradeCards);
  const claimCardBonus = useGameStore((s) => s.claimCardBonus);
  const cardStyle = useProfileStore((s) => s.equipped.card);
  const [selected, setSelected] = useState<string[]>([]);

  if (player.isBot || player.cards.length === 0) return null;

  const canAct = game.phase === 'reinforce';
  const selectedCards = player.cards.filter((c) => selected.includes(c.id));
  const tradeValid = selectedCards.length === 3 && isValidCardTrade(selectedCards);

  const findFirstValidSet = (): string[] | null => {
    const cards = player.cards;
    for (let i = 0; i < cards.length - 2; i += 1) {
      for (let j = i + 1; j < cards.length - 1; j += 1) {
        for (let k = j + 1; k < cards.length; k += 1) {
          if (isValidCardTrade([cards[i], cards[j], cards[k]])) {
            return [cards[i].id, cards[j].id, cards[k].id];
          }
        }
      }
    }
    return null;
  };
  const validSetIds = canAct ? findFirstValidSet() : null;

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev,
    );

  return (
    <div className="hud-panel hud-cards">
      <div className="hud-cards__title">
        Tarjetas de {player.name} ({player.cards.length})
      </div>
      <div className="hud-cards__list">
        {player.cards.map((card) => {
          const owns = game.territories[card.territoryId]?.ownerId === player.id;
          return (
            <div
              key={card.id}
              className={`hud-card hud-card--${cardStyle}${selected.includes(card.id) ? ' hud-card--selected' : ''}`}
              onClick={() => canAct && toggle(card.id)}
            >
              <span className="hud-card__icon">{SYMBOL_ICON[card.symbol]}</span>
              <span className="hud-card__name">{card.territoryName}</span>
              {canAct && owns && !card.bonusClaimed && (
                <button
                  className="btn btn--tiny"
                  onClick={(e) => {
                    e.stopPropagation();
                    claimCardBonus(card.id);
                  }}
                >
                  +2
                </button>
              )}
            </div>
          );
        })}
      </div>
      {canAct && (
        <div className="hud-cards__actions">
          {validSetIds && !tradeValid && (
            <button
              className="btn btn--tiny"
              onClick={() => setSelected(validSetIds)}
            >
              ✨ Auto-elegir canje
            </button>
          )}
          <button
            className="btn btn--primary"
            disabled={!tradeValid}
            onClick={() => tradeCards(selected)}
          >
            Canjear 3 tarjetas
          </button>
        </div>
      )}
    </div>
  );
}

function CombatPanel({ game }: { game: GameState }) {
  const combat = game.lastCombat;
  if (!combat) return null;
  const from = getTerritoryDefinition(combat.fromId)?.name;
  const to = getTerritoryDefinition(combat.toId)?.name;
  return (
    <div className="hud-panel hud-combat">
      <div>
        <strong>{from}</strong> ⚔ <strong>{to}</strong>
      </div>
      <div>
        Dados [{combat.attackerDice.join(', ')}] vs [{combat.defenderDice.join(', ')}] · Bajas: -
        {combat.attackerLosses} / -{combat.defenderLosses}
        {combat.conquered && <span className="hud-combat__win"> · ¡Conquistado!</span>}
      </div>
    </div>
  );
}

function ConquestDialog({ game }: { game: GameState }) {
  const moveConquest = useGameStore((s) => s.moveConquest);
  const player = getCurrentPlayer(game);
  const pending = game.pendingConquest;
  if (player.isBot || game.phase !== 'conquest_move' || !pending) return null;

  const options: number[] = [];
  for (let n = pending.minArmies; n <= pending.maxArmies; n += 1) options.push(n);

  return (
    <div className="hud-modal">
      <div className="hud-panel hud-modal__box">
        <div className="hud-modal__title">
          ¡Conquistaste {getTerritoryDefinition(pending.toId)?.name}!
        </div>
        <p>¿Cuántos ejércitos pasás desde {getTerritoryDefinition(pending.fromId)?.name}?</p>
        <div className="hud-modal__options">
          {options.map((n) => (
            <button key={n} className="btn btn--primary" onClick={() => moveConquest(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VictoryOverlay({
  game,
  matchId,
  onOpenShop,
}: {
  game: GameState;
  matchId: string | null;
  onOpenShop: () => void;
}) {
  const exitGame = useGameStore((s) => s.exitGame);
  const points = useProfileStore((s) => s.points);
  const recordMatchReward = useProfileStore((s) => s.recordMatchReward);

  const isGameOver = game.phase === 'game_over';
  const winner = game.players.find((p) => p.id === game.winnerId);
  const primaryHuman = game.players.find((p) => !p.isBot) ?? null;
  const humanWon = Boolean(primaryHuman && winner && !winner.isBot);

  const reward = useMemo(() => {
    const territoriesOwned = primaryHuman
      ? getPlayerTerritoryCount(primaryHuman.id, game.territories)
      : 0;
    return calculateMatchReward({
      won: humanWon,
      winReason: game.winReason,
      territoriesOwned,
      roundsPlayed: game.round,
      humanParticipated: primaryHuman !== null,
    });
  }, [game.round, game.territories, game.winReason, humanWon, primaryHuman]);

  useEffect(() => {
    if (!isGameOver || !matchId) return;
    recordMatchReward({
      matchId,
      won: humanWon,
      winnerName: winner?.name ?? 'Desconocido',
      rounds: game.round,
      reward,
    });
  }, [isGameOver, matchId, humanWon, winner?.name, game.round, reward, recordMatchReward]);

  if (!isGameOver) return null;

  const commonTarget = getCommonObjectiveTarget(game.players.length);
  const reason =
    game.winReason === 'secret_objective'
      ? 'cumplió su objetivo secreto'
      : game.winReason === 'common_objective'
        ? `ocupó ${commonTarget} países`
        : 'es el último en pie';

  return (
    <div className="hud-modal">
      <div className="hud-panel hud-modal__box victory-box">
        <div className="hud-modal__title">🏆 ¡{winner?.name} ganó!</div>
        <p>
          El ejército {winner ? PLAYER_COLOR_LABEL[winner.color] : ''} {reason}.
        </p>

        <div className="reward-card">
          <div className="reward-card__title">Recompensa de partida</div>
          <div className="reward-card__row">
            <span>Participación</span>
            <span>+{reward.participation} pts</span>
          </div>
          {reward.victoryBonus > 0 && (
            <div className="reward-card__row">
              <span>Bonus de victoria</span>
              <span>+{reward.victoryBonus} pts</span>
            </div>
          )}
          {reward.territoryBonus > 0 && (
            <div className="reward-card__row">
              <span>Países controlados</span>
              <span>+{reward.territoryBonus} pts</span>
            </div>
          )}
          <div className="reward-card__row">
            <span>Rondas jugadas ({game.round})</span>
            <span>+{reward.roundBonus} pts</span>
          </div>
          <div className="reward-card__total">
            <span>Total ganado</span>
            <span>🪙 +{reward.total} pts</span>
          </div>
          <div className="reward-card__balance">Saldo actual: 🪙 {points} pts</div>
        </div>

        <div className="victory-actions">
          <button
            className="btn"
            onClick={() => {
              exitGame();
              onOpenShop();
            }}
          >
            🛒 Ir a la Tienda
          </button>
          <button className="btn btn--primary" onClick={exitGame}>
            Volver al menú
          </button>
        </div>
      </div>
    </div>
  );
}

function LogPanel({ game }: { game: GameState }) {
  const entries = game.log.slice(-6).reverse();
  return (
    <div className="hud-panel hud-log">
      {entries.map((e) => (
        <div key={e.id} className="hud-log__entry">
          {e.message}
        </div>
      ))}
    </div>
  );
}

function ErrorToast() {
  const error = useGameStore((s) => s.error);
  const dismiss = useGameStore((s) => s.dismissError);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(dismiss, 3500);
    return () => clearTimeout(timer);
  }, [error, dismiss]);
  if (!error) return null;
  return (
    <div className="hud-toast" onClick={dismiss}>
      {error}
    </div>
  );
}

export function GameHud({
  onOpenSettings,
  onOpenShop,
  onOpenTutorial,
}: GameHudProps) {
  const game = useGameStore((s) => s.game);
  const matchId = useGameStore((s) => s.matchId);
  const botsPaused = useGameStore((s) => s.botsPaused);
  const stepBot = useGameStore((s) => s.stepBot);
  const botSpeed = useSettingsStore((s) => s.botSpeed);
  const [showContinents, setShowContinents] = useState(false);

  const currentPlayer = game ? getCurrentPlayer(game) : null;
  const isBotTurn = Boolean(game && game.phase !== 'game_over' && currentPlayer?.isBot);

  useEffect(() => {
    if (!isBotTurn || botsPaused) return;
    const timer = setTimeout(() => {
      stepBot();
    }, BOT_DELAY_MS[botSpeed]);
    return () => clearTimeout(timer);
  }, [game, isBotTurn, botsPaused, botSpeed, stepBot]);

  if (!game || !currentPlayer) return null;

  return (
    <div className="hud">
      <TopBar
        game={game}
        showContinents={showContinents}
        onToggleContinents={() => setShowContinents((v) => !v)}
        onOpenSettings={onOpenSettings}
        onOpenShop={onOpenShop}
        onOpenTutorial={onOpenTutorial}
      />
      <div className="hud-left">
        <TurnPanel key={`${currentPlayer.id}-${game.phase}`} game={game} />
        <CardsPanel key={`${currentPlayer.id}-${currentPlayer.cards.length}`} game={game} />
      </div>
      <div className="hud-right">
        <PlayersPanel game={game} />
        {showContinents && <ContinentsPopover game={game} />}
        <LogPanel game={game} />
      </div>
      <GuidedOverlay onOpenShop={onOpenShop} />
      <div className="hud-bottom">
        <CombatPanel game={game} />
      </div>
      <ConquestDialog game={game} />
      <VictoryOverlay game={game} matchId={matchId} onOpenShop={onOpenShop} />
      <ErrorToast />
    </div>
  );
}
