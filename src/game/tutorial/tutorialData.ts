import type { GameState } from '../../types/game.ts';
import { getCurrentPlayer } from '../engine/gameEngine.ts';

export interface PlatformGuideSlide {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  bullets: readonly string[];
  tip: string;
}

export const PLATFORM_GUIDE_SLIDES: readonly PlatformGuideSlide[] = [
  {
    id: 'welcome',
    icon: '🌍',
    title: 'Bienvenido a T.E.G. 3D',
    subtitle: 'Táctica y Estrategia de la Guerra en el navegador',
    bullets: [
      'El tablero tiene 50 países agrupados en 6 continentes con bonus propios (+2 a +7 ejércitos).',
      'Ganás la partida al cumplir tu Objetivo Secreto o el Objetivo Común de ocupar 30 países.',
      'Podés jugar partidas locales de 2 a 6 jugadores combinando humanos y bots.',
    ],
    tip: 'Cada país con líneas punteadas en el océano es un puente marítimo limítrofe (por ejemplo, Alaska–Kamchatka o Chile–Australia).',
  },
  {
    id: 'profile',
    icon: '👤',
    title: 'Tu Perfil y Puntos por Partida',
    subtitle: 'Personalizá tu identidad militar y acumulá recompensas',
    bullets: [
      'Registrá tu nombre, avatar, título y color favorito de ejército desde "Mi Perfil".',
      'Tu perfil se precarga automáticamente al armar una partida local.',
      'Cada partida completada otorga puntos 🪙 según participación, victoria, países controlados y rondas.',
    ],
    tip: 'Además recibís +100 puntos extra al completar la Práctica Guiada en el tablero.',
  },
  {
    id: 'shop',
    icon: '🛒',
    title: 'Tienda de Cosméticos 3D',
    subtitle: 'Canjeá tus puntos por personalización visual real',
    bullets: [
      'Fichas 3D: discos clásicos, torreones hexagonales, estandartes con cristal dorado y obeliscos.',
      'Mapas 3D: Océano Atlántico, Cartografía Antigua, Nocturno, Expedición Ártica y Frontera Volcánica.',
      'Tarjetas: Edición Dorada, Radar Táctico y Terciopelo Real.',
    ],
    tip: 'Podés abrir la tienda incluso durante una partida (botón 🛒 en la barra superior) para ver el cambio en vivo.',
  },
  {
    id: 'controls',
    icon: '🎮',
    title: 'Controles de Cámara y Tablero 3D',
    subtitle: 'Navegá el mapa con precisión y rapidez',
    bullets: [
      'Click izquierdo + arrastrar: rotar la cámara alrededor del tablero.',
      'Click derecho + arrastrar: desplazar la vista lateralmente.',
      'Rueda del mouse: acercar o alejar el zoom.',
      'Shift + Click en un país: colocar todos los refuerzos o reagrupar el máximo de ejércitos de una vez.',
    ],
    tip: 'En ⚙️ Configuración podés activar "Mostrar siempre el nombre de los países", ajustar sombras y velocidad de bots.',
  },
  {
    id: 'practice',
    icon: '⚔️',
    title: 'Ciclo de Turno y Práctica Guiada',
    subtitle: '1. Refuerzos → 2. Ataque → 3. Reagrupamiento → Tarjeta',
    bullets: [
      'Al inicio hay 2 rondas de incorporación (5 y 3 ejércitos). Luego cada turno comienza con refuerzos.',
      'Para atacar necesitás 2+ ejércitos; podés elegir tirar 1, 2 o 3 dados. En empate siempre gana el defensor.',
      'Si conquistás al menos 1 país en tu turno, robás una tarjeta de país para futuros canjes.',
    ],
    tip: 'Probá la Práctica Guiada interactiva ahora para aprender cada fase directo sobre el tablero 3D.',
  },
] as const;

export type GuidedStepId =
  | 'place_initial'
  | 'select_attacker'
  | 'perform_attack'
  | 'finish_attacks'
  | 'regroup_and_end'
  | 'completed';

export interface GuidedStepInfo {
  id: GuidedStepId;
  stepNumber: number;
  totalSteps: number;
  title: string;
  instruction: string;
  hint: string;
}

export const GUIDED_STEPS: readonly GuidedStepInfo[] = [
  {
    id: 'place_initial',
    stepNumber: 1,
    totalSteps: 6,
    title: 'Incorporación inicial de ejércitos',
    instruction:
      'Hacé click en tus países para colocar tus 5 y luego 3 ejércitos iniciales (el Bot colocará los suyos entre rondas).',
    hint: 'Tip: mantené Shift + Click en un país fronterizo con enemigos para concentrar tropas rápido y atacar mejor.',
  },
  {
    id: 'select_attacker',
    stepNumber: 2,
    totalSteps: 6,
    title: 'Elegí tu país atacante',
    instruction:
      '¡Ya estás en fase de Ataque! Hacé click en uno de tus países que tenga 2 o más ejércitos y limite con un país rival.',
    hint: 'Al seleccionarlo, el país se elevará y los enemigos atacables brillarán en dorado.',
  },
  {
    id: 'perform_attack',
    stepNumber: 3,
    totalSteps: 6,
    title: 'Lanzá tu primer ataque con dados 3D',
    instruction:
      'Podés elegir 1, 2, 3 o Máx dados en el panel izquierdo y luego hacer click en un país enemigo iluminado en dorado.',
    hint: 'Los dados rodarán en la bandeja inferior. Recordá: en caso de empate en un dado, gana el defensor.',
  },
  {
    id: 'finish_attacks',
    stepNumber: 4,
    totalSteps: 6,
    title: 'Conquista y fin de ataques',
    instruction:
      'Si conquistaste el país, elegí cuántos ejércitos pasar (1 a 3). Cuando termines de atacar, presioná «Terminar ataques».',
    hint: 'Conquistar al menos 1 país en tu turno te garantiza robar una tarjeta de país al cerrar el turno.',
  },
  {
    id: 'regroup_and_end',
    stepNumber: 5,
    totalSteps: 6,
    title: 'Reagrupamiento y cierre de turno',
    instruction:
      'En Reagrupamiento podés mover ejércitos entre dos de tus países limítrofes (dejando al menos 1) y luego tocar «Terminar turno».',
    hint: 'También podés abrir 🎯 Objetivo en el panel izquierdo para ver tu misión secreta.',
  },
  {
    id: 'completed',
    stepNumber: 6,
    totalSteps: 6,
    title: '¡Práctica completada!',
    instruction:
      'Ya conocés el ciclo completo del TEG 3D. Podés seguir jugando esta partida hasta ganar o volver al menú para visitar la tienda.',
    hint: 'Acordate de usar tus tarjetas en la fase de Refuerzos para canjear ejércitos extra o cobrar el bonus +2.',
  },
] as const;

export const TUTORIAL_GRADUATION_REWARD = 100;

export interface GuidedProgressInput {
  currentStepIndex: number;
  game: GameState | null;
  selectedId: string | null;
  combatSeq: number;
}

/**
 * Evalúa si el jugador cumplió la condición del paso actual de la práctica guiada
 * y devuelve el nuevo índice de paso.
 */
export function evaluateGuidedStepIndex(input: GuidedProgressInput): number {
  const { currentStepIndex, game, selectedId, combatSeq } = input;
  if (!game) return currentStepIndex;
  if (currentStepIndex >= GUIDED_STEPS.length - 1) return currentStepIndex;

  const currentPlayer = getCurrentPlayer(game);
  const isHumanTurn = !currentPlayer.isBot;

  if (game.phase === 'game_over') {
    return GUIDED_STEPS.length - 1;
  }

  let idx = currentStepIndex;

  // Paso 0 (place_initial) -> avanza cuando el humano entra en fase attack
  if (idx === 0 && isHumanTurn && game.phase === 'attack') {
    idx = 1;
  }

  // Paso 1 (select_attacker) -> avanza cuando selecciona un país atacante o ya atacó
  if (
    idx === 1 &&
    isHumanTurn &&
    ((game.phase === 'attack' && selectedId !== null) || combatSeq > 0)
  ) {
    idx = 2;
  }

  // Paso 2 (perform_attack) -> avanza tras realizar al menos 1 ataque o pasar a regroup
  if (
    idx === 2 &&
    (combatSeq > 0 || (isHumanTurn && game.phase === 'regroup'))
  ) {
    idx = 3;
  }

  // Paso 3 (finish_attacks) -> avanza al entrar en fase regroup
  if (idx === 3 && isHumanTurn && game.phase === 'regroup') {
    idx = 4;
  }

  // Paso 4 (regroup_and_end) -> avanza cuando el humano finaliza su turno (pasa al bot o ronda 2)
  if (idx === 4 && (!isHumanTurn || game.round >= 2)) {
    idx = 5;
  }

  return idx;
}
