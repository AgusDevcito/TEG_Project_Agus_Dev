import { Canvas } from '@react-three/fiber';
import { MAP_SKIN_PALETTES } from '../game/shop/catalog.ts';
import { useGameStore } from '../stores/gameStore.ts';
import { useProfileStore } from '../stores/profileStore.ts';
import { useSettingsStore } from '../stores/settingsStore.ts';
import { Board } from './Board/Board.tsx';
import { CameraRig } from './Camera/CameraRig.tsx';
import { DiceTray } from './Dice/DiceTray.tsx';
import { CombatEffects } from './Effects/CombatEffects.tsx';

export function GameScene() {
  const clearSelection = useGameStore((s) => s.clearSelection);
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const equippedMap = useProfileStore((s) => s.equipped.map);

  const palette = MAP_SKIN_PALETTES[equippedMap];
  const shadowsEnabled = graphicsQuality !== 'low';
  const dpr: [number, number] =
    graphicsQuality === 'low' ? [1, 1] : graphicsQuality === 'medium' ? [1, 1.5] : [1, 2];
  const shadowSize = graphicsQuality === 'high' ? 2048 : 1024;

  return (
    <Canvas
      className="game-canvas"
      shadows={shadowsEnabled}
      dpr={dpr}
      camera={{ position: [0, 14.4, 11.8], fov: 45, near: 0.1, far: 200 }}
      onPointerMissed={() => clearSelection()}
    >
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 38, 80]} />

      <ambientLight intensity={palette.ambientIntensity} />
      <hemisphereLight args={['#e3f0ff', palette.table, 0.55]} />
      <directionalLight
        position={[8, 16, 7]}
        intensity={palette.sunIntensity}
        castShadow={shadowsEnabled}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0005}
      />

      <Board />
      <CombatEffects />
      <DiceTray />
      <CameraRig />
    </Canvas>
  );
}
