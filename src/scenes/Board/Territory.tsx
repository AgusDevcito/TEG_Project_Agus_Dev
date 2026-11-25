import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { CONTINENTS, getCurrentPlayer, getTerritoryDefinition } from '../../game/index.ts';
import { isValidTarget, useGameStore } from '../../stores/gameStore.ts';
import { useSettingsStore } from '../../stores/settingsStore.ts';
import { ArmyStack } from '../Pieces/ArmyStack.tsx';
import { BOARD_COLORS, PLAYER_COLOR_HEX } from '../colors.ts';
import { BEVEL_SIZE, BEVEL_THICKNESS, LAND_DEPTH, LAND_TOP } from './boardConstants.ts';
import { MOUNTAINOUS_TERRITORIES } from './realWorldPolygons.ts';
import { pointInPolygon, type TerritoryShape, type Vec2 } from './territoryShapes.ts';

const TREE_GEOMETRY = new THREE.ConeGeometry(0.06, 0.21, 6);
const TREE_MATERIAL = new THREE.MeshStandardMaterial({
  color: BOARD_COLORS.tree,
  roughness: 0.9,
  flatShading: true,
});

const ROCK_GEOMETRY = new THREE.ConeGeometry(0.16, 0.28, 5);
const ROCK_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#343840',
  roughness: 0.92,
  flatShading: true,
});

const SNOW_GEOMETRY = new THREE.ConeGeometry(0.072, 0.125, 5);
const SNOW_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#eef4fa',
  roughness: 0.65,
  flatShading: true,
});

type TerritoryMaterials = [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial];
const materialCache = new Map<string, TerritoryMaterials>();

/** Materiales persistentes por país: [cara superior, laterales/bisel] */
function getTerritoryMaterials(id: string): TerritoryMaterials {
  let materials = materialCache.get(id);
  if (!materials) {
    materials = [
      new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.02 }),
    ];
    materialCache.set(id, materials);
  }
  return materials;
}

function applyTerritoryColor(id: string, hex: string): void {
  const [top, side] = getTerritoryMaterials(id);
  top.color.set(hex);
  side.color.set(hex).offsetHSL(0, -0.08, -0.16);
}

function applyTerritoryGlow(
  id: string,
  glow: number,
  emissiveHex: string,
  delta: number,
): void {
  const [top] = getTerritoryMaterials(id);
  top.emissive.set(emissiveHex);
  top.emissiveIntensity = THREE.MathUtils.damp(top.emissiveIntensity, glow, 10, delta);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PropPlacement {
  x: number;
  z: number;
  s: number;
  rot: number;
}

function getBounds(outline: readonly Vec2[]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of outline) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

function isInsideWithMargin(x: number, z: number, margin: number, outline: readonly Vec2[]): boolean {
  const probes: Vec2[] = [
    [x, z],
    [x + margin, z],
    [x - margin, z],
    [x, z + margin],
    [x, z - margin],
  ];
  return probes.every((p) => pointInPolygon(p, outline));
}

function computeDecorations(
  shape: TerritoryShape,
  index: number,
): { trees: PropPlacement[]; mountains: PropPlacement[] } {
  const rng = mulberry32(index * 7919 + 17);
  const { minX, maxX, minZ, maxZ } = getBounds(shape.outline);
  const mountains: PropPlacement[] = [];
  const trees: PropPlacement[] = [];

  if (MOUNTAINOUS_TERRITORIES.has(shape.id)) {
    for (let attempt = 0; attempt < 30 && mountains.length < 2; attempt += 1) {
      const x = minX + rng() * (maxX - minX);
      const z = minZ + rng() * (maxZ - minZ);
      if (Math.hypot(x - shape.center[0], z - shape.center[1]) < 0.38) continue;
      if (!isInsideWithMargin(x, z, 0.16, shape.outline)) continue;
      if (mountains.some((m) => Math.hypot(m.x - x, m.z - z) < 0.24)) continue;
      mountains.push({ x, z, s: 0.78 + rng() * 0.45, rot: rng() * Math.PI * 2 });
    }
  }

  for (let attempt = 0; attempt < 32 && trees.length < 5; attempt += 1) {
    const x = minX + rng() * (maxX - minX);
    const z = minZ + rng() * (maxZ - minZ);
    if (Math.hypot(x - shape.center[0], z - shape.center[1]) < 0.36) continue;
    if (!isInsideWithMargin(x, z, 0.11, shape.outline)) continue;
    if (mountains.some((m) => Math.hypot(m.x - x, m.z - z) < 0.25)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 0.14)) continue;
    trees.push({ x, z, s: 0.68 + rng() * 0.55, rot: rng() * Math.PI * 2 });
  }

  return { trees, mountains };
}

interface TerritoryProps {
  shape: TerritoryShape;
  index: number;
}

function TerritoryComponent({ shape, index }: TerritoryProps) {
  const id = shape.id;
  const definition = getTerritoryDefinition(id)!;

  const ownerColor = useGameStore((s) => {
    const game = s.game;
    if (!game) return null;
    const ownerId = game.territories[id]?.ownerId;
    return game.players.find((p) => p.id === ownerId)?.color ?? null;
  });
  const armies = useGameStore((s) => s.game?.territories[id]?.armies ?? 0);
  const isSelected = useGameStore((s) => s.selectedId === id);
  const isHovered = useGameStore((s) => s.hoveredId === id);
  const isTarget = useGameStore((s) => isValidTarget(s.game, s.selectedId, id));
  const isActiveOwn = useGameStore((s) => {
    const game = s.game;
    if (!game || game.phase === 'game_over') return false;
    return game.territories[id]?.ownerId === getCurrentPlayer(game).id;
  });

  const setHovered = useGameStore((s) => s.setHovered);
  const clickTerritory = useGameStore((s) => s.clickTerritory);
  const showTrees = useSettingsStore((s) => s.showTrees);
  const showAllNames = useSettingsStore((s) => s.showAllNames);

  const groupRef = useRef<THREE.Group>(null);
  const treesRef = useRef<THREE.InstancedMesh>(null);
  const rocksRef = useRef<THREE.InstancedMesh>(null);
  const snowRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(() => {
    const threeShape = new THREE.Shape(
      shape.outline.map(([x, z]) => new THREE.Vector2(x, -z)),
    );
    const geo = new THREE.ExtrudeGeometry(threeShape, {
      depth: LAND_DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL_THICKNESS,
      bevelSize: BEVEL_SIZE,
      bevelSegments: 2,
      curveSegments: 1,
    });
    geo.computeVertexNormals();
    return geo;
  }, [shape]);

  const materials = useMemo(() => getTerritoryMaterials(id), [id]);

  const { trees, mountains } = useMemo(
    () => computeDecorations(shape, index),
    [shape, index],
  );

  useEffect(() => {
    applyTerritoryColor(
      id,
      ownerColor ? PLAYER_COLOR_HEX[ownerColor] : CONTINENTS[definition.continent].color,
    );
  }, [id, ownerColor, definition.continent]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    if (!showTrees) return;
    const dummy = new THREE.Object3D();

    const treeMesh = treesRef.current;
    if (treeMesh) {
      trees.forEach((tree, i) => {
        dummy.position.set(tree.x, LAND_TOP + 0.105 * tree.s, tree.z);
        dummy.rotation.set(0, tree.rot, 0);
        dummy.scale.setScalar(tree.s);
        dummy.updateMatrix();
        treeMesh.setMatrixAt(i, dummy.matrix);
      });
      treeMesh.instanceMatrix.needsUpdate = true;
    }

    const rockMesh = rocksRef.current;
    const snowMesh = snowRef.current;
    if (rockMesh && snowMesh) {
      mountains.forEach((m, i) => {
        dummy.position.set(m.x, LAND_TOP + 0.14 * m.s, m.z);
        dummy.rotation.set(0, m.rot, 0);
        dummy.scale.setScalar(m.s);
        dummy.updateMatrix();
        rockMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.set(m.x, LAND_TOP + 0.22 * m.s, m.z);
        dummy.rotation.set(0, m.rot, 0);
        dummy.scale.setScalar(m.s);
        dummy.updateMatrix();
        snowMesh.setMatrixAt(i, dummy.matrix);
      });
      rockMesh.instanceMatrix.needsUpdate = true;
      snowMesh.instanceMatrix.needsUpdate = true;
    }
  }, [trees, mountains, showTrees]);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const targetY = isSelected ? 0.18 : isHovered ? 0.07 : 0;
    group.position.y = THREE.MathUtils.damp(group.position.y, targetY, 12, delta);

    let glow = 0;
    if (isTarget) glow = 0.25 + 0.2 * Math.sin(clock.elapsedTime * 6);
    else if (isSelected) glow = 0.35;
    else if (isHovered) glow = 0.2;
    else if (isActiveOwn) glow = 0.06;
    applyTerritoryGlow(
      id,
      glow,
      isTarget ? BOARD_COLORS.highlightTarget : BOARD_COLORS.highlightSource,
      delta,
    );
  });

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(id);
    document.body.style.cursor = 'pointer';
  };

  const handleOut = () => {
    if (useGameStore.getState().hoveredId === id) setHovered(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 5) return;
    clickTerritory(id, e.nativeEvent.shiftKey);
  };

  return (
    <group ref={groupRef}>
      <mesh
        geometry={geometry}
        material={materials}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, BEVEL_THICKNESS, 0]}
        castShadow
        receiveShadow
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      />
      {showTrees && trees.length > 0 && (
        <instancedMesh
          ref={treesRef}
          args={[TREE_GEOMETRY, TREE_MATERIAL, trees.length]}
          castShadow
          raycast={() => null}
        />
      )}
      {showTrees && mountains.length > 0 && (
        <>
          <instancedMesh
            ref={rocksRef}
            args={[ROCK_GEOMETRY, ROCK_MATERIAL, mountains.length]}
            castShadow
            raycast={() => null}
          />
          <instancedMesh
            ref={snowRef}
            args={[SNOW_GEOMETRY, SNOW_MATERIAL, mountains.length]}
            castShadow
            raycast={() => null}
          />
        </>
      )}
      {ownerColor && (
        <ArmyStack
          position={[shape.center[0], LAND_TOP, shape.center[1]]}
          armies={armies}
          color={PLAYER_COLOR_HEX[ownerColor]}
          name={definition.name}
          showName={showAllNames || isHovered || isSelected}
          highlight={isTarget}
        />
      )}
    </group>
  );
}

export const Territory = memo(TerritoryComponent);
