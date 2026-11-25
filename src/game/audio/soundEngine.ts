import { useSettingsStore } from '../../stores/settingsStore.ts';

export type SoundEffect =
  | 'place'
  | 'select'
  | 'dice'
  | 'conquest'
  | 'regroup'
  | 'card'
  | 'turn'
  | 'victory'
  | 'error';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'triangle',
  delay = 0,
  endFreq?: number,
): void {
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), start + duration);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/**
 * Reproduce efectos de sonido procedurales (Web Audio API) respetando la configuración de volumen.
 */
export function playSound(effect: SoundEffect): void {
  const { soundEnabled, masterVolume } = useSettingsStore.getState();
  if (!soundEnabled || masterVolume <= 0.01) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const vol = masterVolume * 0.25;

  switch (effect) {
    case 'select':
      playTone(ctx, 520, 0.06, vol * 0.6, 'sine', 0, 620);
      break;
    case 'place':
      playTone(ctx, 320, 0.09, vol * 0.85, 'triangle', 0, 460);
      break;
    case 'dice':
      playTone(ctx, 210, 0.06, vol * 0.8, 'square', 0, 140);
      playTone(ctx, 290, 0.06, vol * 0.7, 'square', 0.07, 180);
      playTone(ctx, 240, 0.07, vol * 0.8, 'square', 0.14, 150);
      break;
    case 'conquest':
      playTone(ctx, 440, 0.12, vol, 'triangle', 0);
      playTone(ctx, 554, 0.12, vol, 'triangle', 0.1);
      playTone(ctx, 659, 0.24, vol * 1.1, 'triangle', 0.2);
      break;
    case 'regroup':
      playTone(ctx, 390, 0.1, vol * 0.7, 'sine', 0, 490);
      break;
    case 'card':
      playTone(ctx, 600, 0.08, vol * 0.8, 'sine', 0, 820);
      playTone(ctx, 820, 0.12, vol * 0.8, 'sine', 0.08, 960);
      break;
    case 'turn':
      playTone(ctx, 350, 0.11, vol * 0.7, 'sine', 0);
      playTone(ctx, 440, 0.15, vol * 0.75, 'sine', 0.09);
      break;
    case 'victory':
      playTone(ctx, 523, 0.14, vol, 'triangle', 0);
      playTone(ctx, 659, 0.14, vol, 'triangle', 0.13);
      playTone(ctx, 784, 0.16, vol, 'triangle', 0.26);
      playTone(ctx, 1046, 0.4, vol * 1.15, 'triangle', 0.42);
      break;
    case 'error':
      playTone(ctx, 190, 0.14, vol * 0.8, 'sawtooth', 0, 130);
      break;
  }
}
