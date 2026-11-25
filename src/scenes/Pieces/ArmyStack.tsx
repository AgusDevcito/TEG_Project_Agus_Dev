import { useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useProfileStore } from '../../stores/profileStore.ts';

const TOKEN_HEIGHT = 0.08;
const CLASSIC_GEOMETRY = new THREE.CylinderGeometry(0.17, 0.19, TOKEN_HEIGHT, 20);
const HEX_GEOMETRY = new THREE.CylinderGeometry(0.18, 0.2, TOKEN_HEIGHT * 1.15, 6);
const CROWN_TOP_GEOMETRY = new THREE.OctahedronGeometry(0.13, 0);
const OBELISK_GEOMETRY = new THREE.ConeGeometry(0.19, 0.28, 4);
const RING_GEOMETRY = new THREE.TorusGeometry(0.21, 0.032, 8, 20);

const GOLD_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#f2c94c',
  roughness: 0.25,
  metalness: 0.78,
});

const MAX_VISIBLE_TOKENS = 4;

interface ArmyStackProps {
  position: [number, number, number];
  armies: number;
  color: string;
  name: string;
  showName: boolean;
  highlight: boolean;
}

/**
 * Fichas apiladas de un país con contador flotante, animación de rebote al cambiar
 * la cantidad de ejércitos y geometría según el cosmético equipado.
 */
export function ArmyStack({
  position,
  armies,
  color,
  name,
  showName,
  highlight,
}: ArmyStackProps) {
  const pieceStyle = useProfileStore((s) => s.equipped.piece);
  const stackRef = useRef<THREE.Group>(null);
  const crownRef = useRef<THREE.Mesh>(null);
  const prevArmiesRef = useRef(armies);
  const popScaleRef = useRef(1);

  const visibleTokens = Math.max(1, Math.min(MAX_VISIBLE_TOKENS, Math.ceil(armies / 3)));

  const tokenH = pieceStyle === 'piece_hex' ? TOKEN_HEIGHT * 1.15 : TOKEN_HEIGHT;
  const stackHeight =
    pieceStyle === 'piece_star'
      ? 0.28 + (visibleTokens - 1) * 0.07
      : pieceStyle === 'piece_crown'
        ? visibleTokens * tokenH + 0.18
        : visibleTokens * tokenH;

  useEffect(() => {
    if (prevArmiesRef.current !== armies) {
      popScaleRef.current = armies > prevArmiesRef.current ? 1.32 : 0.84;
      prevArmiesRef.current = armies;
    }
  }, [armies]);

  useFrame(({ clock }, delta) => {
    const stack = stackRef.current;
    if (stack) {
      popScaleRef.current = THREE.MathUtils.damp(popScaleRef.current, 1, 10, delta);
      stack.scale.set(1, popScaleRef.current, 1);
    }

    const crown = crownRef.current;
    if (crown) {
      crown.rotation.y += delta * 1.6;
      crown.position.y =
        visibleTokens * tokenH + 0.13 + Math.sin(clock.elapsedTime * 3.2) * 0.025;
    }
  });

  return (
    <group position={position}>
      <group ref={stackRef}>
        {pieceStyle === 'piece_star' ? (
          <>
            <mesh
              geometry={RING_GEOMETRY}
              material={GOLD_MATERIAL}
              rotation={[Math.PI / 2, 0, 0]}
              position={[0, 0.035, 0]}
              castShadow
              raycast={() => null}
            />
            {Array.from({ length: visibleTokens }, (_, i) => (
              <mesh
                key={i}
                geometry={OBELISK_GEOMETRY}
                position={[0, 0.14 + i * 0.07, 0]}
                scale={1 - i * 0.12}
                castShadow
                raycast={() => null}
              >
                <meshStandardMaterial color={color} roughness={0.32} metalness={0.35} />
              </mesh>
            ))}
          </>
        ) : (
          <>
            {Array.from({ length: visibleTokens }, (_, i) => (
              <mesh
                key={i}
                geometry={pieceStyle === 'piece_hex' ? HEX_GEOMETRY : CLASSIC_GEOMETRY}
                position={[0, tokenH / 2 + i * tokenH, 0]}
                castShadow
                raycast={() => null}
              >
                <meshStandardMaterial
                  color={color}
                  roughness={pieceStyle === 'piece_hex' ? 0.3 : 0.4}
                  metalness={pieceStyle === 'piece_hex' ? 0.48 : 0.25}
                />
              </mesh>
            ))}
            {pieceStyle === 'piece_crown' && (
              <mesh
                ref={crownRef}
                geometry={CROWN_TOP_GEOMETRY}
                material={GOLD_MATERIAL}
                position={[0, visibleTokens * tokenH + 0.13, 0]}
                castShadow
                raycast={() => null}
              />
            )}
          </>
        )}
      </group>

      <Html
        position={[0, stackHeight + 0.22, 0]}
        center
        distanceFactor={11}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`army-badge${highlight ? ' army-badge--target' : ''}`}
          style={{ borderColor: color }}
        >
          <span className="army-badge__count">{armies}</span>
          {showName && <span className="army-badge__name">{name}</span>}
        </div>
      </Html>
    </group>
  );
}
