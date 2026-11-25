import { TERRITORIES } from '../../game/territories/mapData.ts';
import { REAL_WORLD_POLYGONS, type Vec2 } from './realWorldPolygons.ts';

export type { Vec2 };

export interface TerritoryShape {
  id: string;
  /** Contorno en coordenadas de mundo (x, z), sentido antihorario en plano XZ visto desde arriba */
  outline: Vec2[];
  /** Punto interior garantizado (para ubicar fichas, contador y rutas) */
  center: Vec2;
}

/**
 * Separación hacia adentro aplicada a cada país para crear el canal oscuro entre
 * bloques biselados (el canal total entre vecinos es 2 * INSET_MARGIN).
 */
const INSET_MARGIN = 0.068;

function polygonSignedArea(points: readonly Vec2[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}

export function pointInPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointToSegmentDistSq(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
  const px = a[0] + t * dx;
  const py = a[1] + t * dy;
  return (p[0] - px) ** 2 + (p[1] - py) ** 2;
}

function minDistanceToEdges(p: Vec2, polygon: readonly Vec2[]): number {
  let minSq = Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    const dSq = pointToSegmentDistSq(p, polygon[i], polygon[(i + 1) % polygon.length]);
    if (dSq < minSq) minSq = dSq;
  }
  return Math.sqrt(minSq);
}

/**
 * Desplaza cada arista del polígono hacia su interior una distancia `margin`
 * usando la intersección de las rectas paralelas adyacentes (miter limitado).
 */
function insetPolygon(ccwPoints: readonly Vec2[], margin: number): Vec2[] {
  const n = ccwPoints.length;
  const out: Vec2[] = [];

  for (let i = 0; i < n; i += 1) {
    const prev = ccwPoints[(i - 1 + n) % n];
    const curr = ccwPoints[i];
    const next = ccwPoints[(i + 1) % n];

    const e1x = curr[0] - prev[0];
    const e1y = curr[1] - prev[1];
    const l1 = Math.hypot(e1x, e1y) || 1;
    // Normal interior para orientación con área positiva en (x, z)
    const n1x = -e1y / l1;
    const n1y = e1x / l1;

    const e2x = next[0] - curr[0];
    const e2y = next[1] - curr[1];
    const l2 = Math.hypot(e2x, e2y) || 1;
    const n2x = -e2y / l2;
    const n2y = e2x / l2;

    const bx = n1x + n2x;
    const by = n1y + n2y;
    const bLen = Math.hypot(bx, by);

    if (bLen < 1e-4) {
      out.push([curr[0] + n1x * margin, curr[1] + n1y * margin]);
      continue;
    }

    const ux = bx / bLen;
    const uy = by / bLen;
    const cosHalf = ux * n1x + uy * n1y;
    const miter = Math.min(margin * 1.7, margin / Math.max(0.45, cosHalf));
    out.push([curr[0] + ux * miter, curr[1] + uy * miter]);
  }

  return out;
}

/**
 * Calcula un punto interior óptimo (el más alejado de todos los bordes)
 * muestreando una grilla dentro del bounding box del polígono.
 */
function computeVisualCenter(polygon: readonly Vec2[]): Vec2 {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const [x, z] of polygon) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  // Candidato inicial: centroide promedio
  let cx = 0;
  let cz = 0;
  for (const [x, z] of polygon) {
    cx += x;
    cz += z;
  }
  cx /= polygon.length;
  cz /= polygon.length;

  let best: Vec2 = [cx, cz];
  let bestDist = pointInPolygon(best, polygon) ? minDistanceToEdges(best, polygon) : -1;

  const grid = 10;
  for (let ix = 1; ix < grid; ix += 1) {
    for (let iz = 1; iz < grid; iz += 1) {
      const candidate: Vec2 = [
        minX + ((maxX - minX) * ix) / grid,
        minZ + ((maxZ - minZ) * iz) / grid,
      ];
      if (!pointInPolygon(candidate, polygon)) continue;
      const dist = minDistanceToEdges(candidate, polygon);
      if (dist > bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
  }

  return best;
}

export function computeTerritoryShapes(): TerritoryShape[] {
  return TERRITORIES.map((territory) => {
    const raw = REAL_WORLD_POLYGONS[territory.id];
    if (!raw) {
      throw new Error(`Falta la silueta geográfica real para el país: ${territory.id}`);
    }

    const ordered: Vec2[] = [...raw];
    if (polygonSignedArea(ordered) < 0) {
      ordered.reverse();
    }

    const outline = insetPolygon(ordered, INSET_MARGIN);
    const center = computeVisualCenter(outline);

    return {
      id: territory.id,
      outline,
      center,
    };
  });
}

let cachedShapes: TerritoryShape[] | null = null;
let cachedShapeMap: Record<string, TerritoryShape> | null = null;

export function getTerritoryShapes(): TerritoryShape[] {
  if (!cachedShapes) {
    cachedShapes = computeTerritoryShapes();
  }
  return cachedShapes;
}

export function getTerritoryShapeMap(): Record<string, TerritoryShape> {
  if (!cachedShapeMap) {
    cachedShapeMap = Object.fromEntries(
      getTerritoryShapes().map((s) => [s.id, s]),
    );
  }
  return cachedShapeMap;
}

export function getTerritoryShapeArea(shape: TerritoryShape): number {
  return Math.abs(polygonSignedArea(shape.outline));
}
