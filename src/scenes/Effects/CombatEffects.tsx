import { useEffect, useMemo, useRef, useState } from 'react';
import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { isValidTarget, useGameStore } from '../../stores/gameStore.ts';
import { BOARD_WIDTH, LAND_TOP } from '../Board/boardConstants.ts';
import { getTerritoryShapeMap } from '../Board/territoryShapes.ts';

const ARROW_HEAD_GEOMETRY = new THREE.ConeGeometry(0.14, 0.34, 8);
const ORB_GEOMETRY = new THREE.SphereGeometry(0.12, 12, 12);
const RING_GEOMETRY = new THREE.RingGeometry(0.18, 0.3, 28);

const IMPACT_RING_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#ff5252',
  transparent: true,
  opacity: 0,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const CONQUEST_RING_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#ffd740',
  transparent: true,
  opacity: 0,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const ORB_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#ffd740',
  transparent: true,
  opacity: 0,
});

function buildArcPoints(
  from: readonly [number, number],
  to: readonly [number, number],
  segments = 24,
): [number, number, number][] {
  const [fx, fz] = from;
  const [tx, tz] = to;
  const dist = Math.hypot(tx - fx, tz - fz);
  const peakHeight = Math.min(2.3, 0.55 + dist * 0.24);
  const pts: [number, number, number][] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const x = fx + (tx - fx) * t;
    const z = fz + (tz - fz) * t;
    const y = LAND_TOP + 0.16 + Math.sin(Math.PI * t) * peakHeight;
    pts.push([x, y, z]);
  }
  return pts;
}

/**
 * Arco y flecha 3D al apuntar un objetivo válido (ataque o reagrupamiento).
 */
function AimingArc() {
  const game = useGameStore((s) => s.game);
  const selectedId = useGameStore((s) => s.selectedId);
  const hoveredId = useGameStore((s) => s.hoveredId);

  const shapeMap = useMemo(() => getTerritoryShapeMap(), []);
  const valid = isValidTarget(game, selectedId, hoveredId ?? '');

  if (!valid || !selectedId || !hoveredId || !game) return null;

  const from = shapeMap[selectedId]?.center;
  const to = shapeMap[hoveredId]?.center;
  if (!from || !to) return null;

  // Para puentes que cruzan el borde del mapa, no dibujar una curva cruzando todo el tablero
  if (Math.abs(from[0] - to[0]) > BOARD_WIDTH / 2) return null;

  const points = buildArcPoints(from, to, 20);
  const isAttack = game.phase === 'attack';
  const color = isAttack ? '#ff5252' : '#34d399';

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const dir = new THREE.Vector3(
    last[0] - prev[0],
    last[1] - prev[1],
    last[2] - prev[2],
  ).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir,
  );

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={3}
        transparent
        opacity={0.92}
      />
      <mesh
        geometry={ARROW_HEAD_GEOMETRY}
        position={last}
        quaternion={quat}
        raycast={() => null}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

/**
 * Efectos animados 3D al dispararse un combate: proyectil parabólico,
 * onda de choque / conquista en el país defensor y etiqueta flotante temporal.
 */
function BattleBurst() {
  const combat = useGameStore((s) => s.game?.lastCombat ?? null);
  const combatSeq = useGameStore((s) => s.combatSeq);
  const shapeMap = useMemo(() => getTerritoryShapeMap(), []);

  const orbRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const conquestRingRef = useRef<THREE.Mesh>(null);
  const animStartRef = useRef<number>(-1);
  const [visibleCalloutSeq, setVisibleCalloutSeq] = useState(0);

  const fromCenter = combat ? shapeMap[combat.fromId]?.center : undefined;
  const toCenter = combat ? shapeMap[combat.toId]?.center : undefined;
  const isWrapAround = Boolean(
    fromCenter && toCenter && Math.abs(fromCenter[0] - toCenter[0]) > BOARD_WIDTH / 2,
  );

  const arcPoints = useMemo(() => {
    if (!fromCenter || !toCenter || isWrapAround) return null;
    return buildArcPoints(fromCenter, toCenter, 24);
  }, [fromCenter, toCenter, isWrapAround]);

  useEffect(() => {
    if (combatSeq === 0 || !combat) return;
    animStartRef.current = -1;
    const showTimer = setTimeout(() => setVisibleCalloutSeq(combatSeq), 0);
    const hideTimer = setTimeout(() => setVisibleCalloutSeq(0), 1700);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [combatSeq, combat]);

  useFrame(({ clock }) => {
    if (combatSeq === 0 || !combat || !toCenter) return;
    if (animStartRef.current < 0) {
      animStartRef.current = clock.elapsedTime;
    }

    const elapsed = clock.elapsedTime - animStartRef.current;

    // 1. Proyectil parabólico (0.0s .. 0.45s)
    const orb = orbRef.current;
    if (orb && arcPoints) {
      const t = THREE.MathUtils.clamp(elapsed / 0.45, 0, 1);
      const idx = Math.min(arcPoints.length - 1, Math.floor(t * (arcPoints.length - 1)));
      const pt = arcPoints[idx];
      orb.position.set(pt[0], pt[1], pt[2]);
      ORB_MATERIAL.opacity = t < 1 ? 1 : 0;
      orb.visible = t < 1;
    } else if (orb) {
      orb.visible = false;
    }

    // 2. Onda de choque en destino (0.25s .. 1.1s)
    const ring = ringRef.current;
    if (ring) {
      const rt = THREE.MathUtils.clamp((elapsed - 0.25) / 0.85, 0, 1);
      ring.visible = rt > 0 && rt < 1;
      ring.scale.setScalar(0.6 + rt * 2.8);
      IMPACT_RING_MATERIAL.opacity = (1 - rt) * 0.85;
    }

    // 3. Onda dorada extra si hubo conquista (0.35s .. 1.35s)
    const cRing = conquestRingRef.current;
    if (cRing) {
      const ct = combat.conquered
        ? THREE.MathUtils.clamp((elapsed - 0.35) / 1.0, 0, 1)
        : 1;
      cRing.visible = combat.conquered && ct > 0 && ct < 1;
      cRing.scale.setScalar(0.5 + ct * 3.8);
      CONQUEST_RING_MATERIAL.opacity = (1 - ct) * 0.95;
    }
  });

  if (!combat || !toCenter || combatSeq === 0) return null;

  return (
    <group>
      <mesh
        ref={orbRef}
        geometry={ORB_GEOMETRY}
        material={ORB_MATERIAL}
        visible={false}
        raycast={() => null}
      />
      <mesh
        ref={ringRef}
        geometry={RING_GEOMETRY}
        material={IMPACT_RING_MATERIAL}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[toCenter[0], LAND_TOP + 0.04, toCenter[1]]}
        visible={false}
        raycast={() => null}
      />
      <mesh
        ref={conquestRingRef}
        geometry={RING_GEOMETRY}
        material={CONQUEST_RING_MATERIAL}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[toCenter[0], LAND_TOP + 0.06, toCenter[1]]}
        visible={false}
        raycast={() => null}
      />
      {visibleCalloutSeq === combatSeq && (
        <Html
          position={[toCenter[0], LAND_TOP + 0.95, toCenter[1]]}
          center
          distanceFactor={11}
          zIndexRange={[35, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`combat-callout${combat.conquered ? ' combat-callout--conquest' : ''}`}
          >
            {combat.conquered
              ? '🚩 ¡CONQUISTADO!'
              : `⚔ -${combat.attackerLosses} / -${combat.defenderLosses}`}
          </div>
        </Html>
      )}
    </group>
  );
}

export function CombatEffects() {
  return (
    <group>
      <AimingArc />
      <BattleBurst />
    </group>
  );
}
