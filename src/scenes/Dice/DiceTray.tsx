import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore.ts';
import { TRAY_TOP, TRAY_Z } from '../Board/boardConstants.ts';

type DiceScheme = 'attack' | 'defense';

const DIE_SIZE = 0.42;
const DIE_GEOMETRY = new THREE.BoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE);
/** Valor de cada cara en el orden de materiales de BoxGeometry: +x, -x, +y, -y, +z, -z */
const FACE_VALUES = [3, 4, 1, 6, 2, 5] as const;
const ROLL_DURATION = 0.95;

const SCHEMES: Record<DiceScheme, { bg: string; pip: string }> = {
  attack: { bg: '#c0392b', pip: '#ffffff' },
  defense: { bg: '#f4efe3', pip: '#1d2b3a' },
};

const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

const textureCache = new Map<string, THREE.Texture>();

function getFaceTexture(value: number, scheme: DiceScheme): THREE.Texture {
  const key = `${scheme}-${value}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const { bg, pip } = SCHEMES[scheme];
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, size - 6, size - 6);
  ctx.fillStyle = pip;
  for (const [cx, cy] of PIP_LAYOUT[value]) {
    ctx.beginPath();
    ctx.arc(28 + cx * 36, 28 + cy * 36, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

const dieMaterialCache = new Map<string, THREE.MeshStandardMaterial[]>();

/** Materiales persistentes por dado (uno por cara) */
function getDieMaterials(scheme: DiceScheme, slot: number): THREE.MeshStandardMaterial[] {
  const key = `${scheme}-${slot}`;
  let materials = dieMaterialCache.get(key);
  if (!materials) {
    materials = FACE_VALUES.map(
      (v) => new THREE.MeshStandardMaterial({ map: getFaceTexture(v, scheme), roughness: 0.45 }),
    );
    dieMaterialCache.set(key, materials);
  }
  return materials;
}

/** Atenúa los dados que perdieron su comparación */
function setDieLost(scheme: DiceScheme, slot: number, lost: boolean): void {
  for (const m of getDieMaterials(scheme, slot)) {
    m.transparent = lost;
    m.opacity = lost ? 0.45 : 1;
    m.needsUpdate = true;
  }
}

/** Rotación final [x, y, z] (orden YXZ) que deja `value` mirando hacia arriba */
function targetRotation(value: number, yaw: number): [number, number, number] {
  switch (value) {
    case 2:
      return [-Math.PI / 2, yaw, 0];
    case 3:
      return [0, yaw, Math.PI / 2];
    case 4:
      return [0, yaw, -Math.PI / 2];
    case 5:
      return [Math.PI / 2, yaw, 0];
    case 6:
      return [Math.PI, yaw, 0];
    default:
      return [0, yaw, 0];
  }
}

interface DieProps {
  value: number;
  scheme: DiceScheme;
  x: number;
  index: number;
  seq: number;
  lost: boolean;
}

function Die({ value, scheme, x, index, seq, lost }: DieProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const anim = useRef({ start: -1, spin: [0, 0, 0] as [number, number, number] });

  const materials = useMemo(() => getDieMaterials(scheme, index), [scheme, index]);

  useEffect(() => {
    const turns = () => (2 + Math.floor(Math.random() * 2)) * Math.PI * 2;
    anim.current = { start: -1, spin: [turns(), turns() * 0.5, turns()] };
  }, [seq]);

  useEffect(() => {
    setDieLost(scheme, index, lost);
  }, [scheme, index, lost]);

  const yaw = ((index * 0.37 + seq * 0.61) % 0.6) - 0.3;
  const target = targetRotation(value, yaw);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const a = anim.current;
    if (a.start < 0) a.start = clock.elapsedTime + index * 0.08;
    const t = THREE.MathUtils.clamp((clock.elapsedTime - a.start) / ROLL_DURATION, 0, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const rest = 1 - ease;
    mesh.rotation.set(
      target[0] + a.spin[0] * rest,
      target[1] + a.spin[1] * rest,
      target[2] + a.spin[2] * rest,
    );
    mesh.position.y = TRAY_TOP + DIE_SIZE / 2 + Math.sin(Math.PI * t) * 0.9 * (1 - t);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={DIE_GEOMETRY}
      material={materials}
      position={[x, TRAY_TOP + DIE_SIZE / 2, TRAY_Z]}
      rotation-order="YXZ"
      castShadow
    />
  );
}

/**
 * Bandeja de dados 3D: muestra y anima la última tirada de ataque/defensa.
 */
export function DiceTray() {
  const combat = useGameStore((s) => s.game?.lastCombat ?? null);
  const seq = useGameStore((s) => s.combatSeq);

  if (!combat) return null;

  const comparisons = Math.min(combat.attackerDice.length, combat.defenderDice.length);
  const attackerLost = (i: number) => i < comparisons && combat.attackerDice[i] <= combat.defenderDice[i];
  const defenderLost = (i: number) => i < comparisons && combat.attackerDice[i] > combat.defenderDice[i];

  return (
    <group>
      {combat.attackerDice.map((value, i) => (
        <Die
          key={`a-${i}`}
          value={value}
          scheme="attack"
          x={-1.0 - i * 0.7}
          index={i}
          seq={seq}
          lost={attackerLost(i)}
        />
      ))}
      {combat.defenderDice.map((value, i) => (
        <Die
          key={`d-${i}`}
          value={value}
          scheme="defense"
          x={1.0 + i * 0.7}
          index={i + 3}
          seq={seq}
          lost={defenderLost(i)}
        />
      ))}
      <Html position={[-2.6, TRAY_TOP + 0.05, TRAY_Z + 0.75]} center distanceFactor={11} style={{ pointerEvents: 'none' }}>
        <div className="dice-label dice-label--attack">Ataque</div>
      </Html>
      <Html position={[2.6, TRAY_TOP + 0.05, TRAY_Z + 0.75]} center distanceFactor={11} style={{ pointerEvents: 'none' }}>
        <div className="dice-label dice-label--defense">Defensa</div>
      </Html>
    </group>
  );
}
