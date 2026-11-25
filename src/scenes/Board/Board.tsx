import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAP_SKIN_PALETTES } from '../../game/shop/catalog.ts';
import { useProfileStore } from '../../stores/profileStore.ts';
import { useSettingsStore } from '../../stores/settingsStore.ts';
import {
  BOARD_DEPTH,
  BOARD_WIDTH,
  FRAME_HEIGHT,
  FRAME_THICKNESS,
  TRAY_TOP,
  TRAY_Z,
} from './boardConstants.ts';
import { SeaRoutes } from './SeaRoutes.tsx';
import { Territory } from './Territory.tsx';
import { getTerritoryShapes } from './territoryShapes.ts';

let cachedOceanTexture: THREE.CanvasTexture | null = null;

/**
 * Genera una textura procedural repetible de oleaje suave para el océano.
 */
function getOceanBumpTexture(): THREE.CanvasTexture {
  if (cachedOceanTexture) return cachedOceanTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const nx = (x / size) * Math.PI * 2;
      const ny = (y / size) * Math.PI * 2;
      const wave =
        Math.sin(nx * 3 + ny * 2) * 0.45 +
        Math.cos(nx * 5 - ny * 4) * 0.35 +
        Math.sin((nx + ny) * 7) * 0.2;
      const shade = Math.floor(128 + wave * 65);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 6);
  cachedOceanTexture = texture;
  return texture;
}

const OCEAN_MATERIAL = new THREE.MeshStandardMaterial({
  roughness: 0.32,
  metalness: 0.18,
  bumpScale: 0.032,
});

function OceanAndFrame() {
  const equippedMap = useProfileStore((s) => s.equipped.map);
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const palette = MAP_SKIN_PALETTES[equippedMap];
  const halfW = BOARD_WIDTH / 2;
  const halfD = BOARD_DEPTH / 2;
  const frameY = FRAME_HEIGHT / 2 - 0.2;
  const animOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const tex = getOceanBumpTexture();
    OCEAN_MATERIAL.color.set(palette.ocean);
    OCEAN_MATERIAL.bumpMap = graphicsQuality === 'low' ? null : tex;
    OCEAN_MATERIAL.needsUpdate = true;
  }, [palette.ocean, graphicsQuality]);

  useFrame((_, delta) => {
    if (graphicsQuality === 'low') return;
    const tex = cachedOceanTexture;
    if (!tex) return;
    animOffsetRef.current.x = (animOffsetRef.current.x + delta * 0.018) % 1;
    animOffsetRef.current.y = (animOffsetRef.current.y + delta * 0.01) % 1;
    tex.offset.set(animOffsetRef.current.x, animOffsetRef.current.y);
  });

  return (
    <group>
      {/* Mesa */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={palette.table} roughness={0.95} />
      </mesh>

      {/* Océano con oleaje suave */}
      <mesh position={[0, -0.03, 0]} material={OCEAN_MATERIAL} receiveShadow>
        <boxGeometry args={[BOARD_WIDTH, 0.1, BOARD_DEPTH]} />
      </mesh>

      {/* Marco de madera */}
      {[
        {
          pos: [0, frameY, -halfD - FRAME_THICKNESS / 2],
          size: [BOARD_WIDTH + FRAME_THICKNESS * 2, FRAME_HEIGHT, FRAME_THICKNESS],
        },
        {
          pos: [0, frameY, halfD + FRAME_THICKNESS / 2],
          size: [BOARD_WIDTH + FRAME_THICKNESS * 2, FRAME_HEIGHT, FRAME_THICKNESS],
        },
        {
          pos: [-halfW - FRAME_THICKNESS / 2, frameY, 0],
          size: [FRAME_THICKNESS, FRAME_HEIGHT, BOARD_DEPTH],
        },
        {
          pos: [halfW + FRAME_THICKNESS / 2, frameY, 0],
          size: [FRAME_THICKNESS, FRAME_HEIGHT, BOARD_DEPTH],
        },
      ].map((bar, i) => (
        <mesh
          key={i}
          position={bar.pos as [number, number, number]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={bar.size as [number, number, number]} />
          <meshStandardMaterial color={palette.frame} roughness={0.7} />
        </mesh>
      ))}

      {/* Bandeja de dados */}
      <mesh position={[0, TRAY_TOP / 2, TRAY_Z]} receiveShadow>
        <boxGeometry args={[6.4, TRAY_TOP, 1.1]} />
        <meshStandardMaterial color={palette.tray} roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Board() {
  const shapes = useMemo(() => getTerritoryShapes(), []);
  const showSeaRoutes = useSettingsStore((s) => s.showSeaRoutes);

  return (
    <group>
      <OceanAndFrame />
      {showSeaRoutes && <SeaRoutes />}
      {shapes.map((shape, index) => (
        <Territory key={shape.id} shape={shape} index={index} />
      ))}
    </group>
  );
}
