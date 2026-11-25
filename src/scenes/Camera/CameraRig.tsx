import { useEffect, useRef, type ComponentRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSettingsStore } from '../../stores/settingsStore.ts';

const TARGET_LIMIT_X = 8;
const TARGET_LIMIT_Z = 5;

/**
 * Cámara orbital con límites: rotar (click izq.), desplazar (click der.) y zoom (rueda).
 * Ajusta automáticamente la distancia inicial en pantallas angostas para que entren los 50 países.
 */
export function CameraRig() {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const sensitivity = useSettingsStore((s) => s.cameraSensitivity);
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const scale = aspect < 1.45 ? Math.min(1.42, 1.45 / aspect) : 1;
    camera.position.set(0, 14.4 * scale, 11.8 * scale);
    controlsRef.current?.target.set(0, 0, 0.5);
    controlsRef.current?.update();
  }, [camera, size.width, size.height]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const t = controls.target;
    t.x = THREE.MathUtils.clamp(t.x, -TARGET_LIMIT_X, TARGET_LIMIT_X);
    t.z = THREE.MathUtils.clamp(t.z, -TARGET_LIMIT_Z, TARGET_LIMIT_Z);
    t.y = 0;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.85 * sensitivity}
      panSpeed={0.9 * sensitivity}
      zoomSpeed={1 * sensitivity}
      minDistance={5}
      maxDistance={30}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI * 0.43}
      screenSpacePanning={false}
    />
  );
}
