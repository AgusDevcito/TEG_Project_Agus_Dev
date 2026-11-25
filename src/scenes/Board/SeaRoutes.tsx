import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { MAP_SKIN_PALETTES } from '../../game/shop/catalog.ts';
import { useProfileStore } from '../../stores/profileStore.ts';
import { BOARD_WIDTH } from './boardConstants.ts';
import { getTerritoryShapeMap } from './territoryShapes.ts';

type Point3 = [number, number, number];

const ROUTE_Y = 0.05;

/**
 * Puentes marítimos reales del tablero del TEG (conexiones separadas por océano).
 */
const MARITIME_BRIDGES: readonly [string, string][] = [
  ['alaska', 'kamchatka'],
  ['chile', 'australia'],
  ['labrador', 'groenlandia'],
  ['nueva_york', 'groenlandia'],
  ['groenlandia', 'islandia'],
  ['islandia', 'gran_bretana'],
  ['islandia', 'suecia'],
  ['gran_bretana', 'espana'],
  ['gran_bretana', 'alemania'],
  ['espana', 'sahara'],
  ['brasil', 'sahara'],
  ['polonia', 'egipto'],
  ['egipto', 'turquia'],
  ['egipto', 'madagascar'],
  ['zaire', 'madagascar'],
  ['kamchatka', 'japon'],
  ['china', 'japon'],
  ['india', 'sumatra'],
  ['malasia', 'borneo'],
  ['sumatra', 'australia'],
  ['borneo', 'australia'],
  ['java', 'australia'],
];

/**
 * Dibuja las conexiones marítimas (puentes) entre países limítrofes separados por agua,
 * incluyendo las rutas que "dan la vuelta" al mapa (Alaska–Kamchatka, Chile–Australia).
 */
export function SeaRoutes() {
  const equippedMap = useProfileStore((s) => s.equipped.map);
  const routeColor = MAP_SKIN_PALETTES[equippedMap].routeColor;

  const routes = useMemo(() => {
    const shapeMap = getTerritoryShapeMap();
    const result: Point3[][] = [];
    const edgeX = BOARD_WIDTH / 2 - 0.15;

    for (const [idA, idB] of MARITIME_BRIDGES) {
      const a = shapeMap[idA];
      const b = shapeMap[idB];
      if (!a || !b) continue;
      const [ax, az] = a.center;
      const [bx, bz] = b.center;

      if (Math.abs(ax - bx) > BOARD_WIDTH / 2) {
        const [left, right] = ax < bx ? [a.center, b.center] : [b.center, a.center];
        const midZ = (left[1] + right[1]) / 2;
        result.push([
          [left[0], ROUTE_Y, left[1]],
          [-edgeX, ROUTE_Y, midZ],
        ]);
        result.push([
          [right[0], ROUTE_Y, right[1]],
          [edgeX, ROUTE_Y, midZ],
        ]);
      } else {
        result.push([
          [ax, ROUTE_Y, az],
          [bx, ROUTE_Y, bz],
        ]);
      }
    }
    return result;
  }, []);

  return (
    <group>
      {routes.map((points, i) => (
        <Line
          key={i}
          points={points}
          color={routeColor}
          lineWidth={1.6}
          dashed
          dashSize={0.18}
          gapSize={0.12}
          transparent
          opacity={0.78}
        />
      ))}
    </group>
  );
}
