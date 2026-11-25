import { describe, expect, it } from 'vitest';
import {
  computeTerritoryShapes,
  getTerritoryShapeArea,
  pointInPolygon,
  type Vec2,
} from '../src/scenes/Board/territoryShapes.ts';

function orientation(a: Vec2, b: Vec2, c: Vec2): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsProperlyIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

describe('Siluetas geográficas reales de los 50 países', () => {
  const shapes = computeTerritoryShapes();

  it('genera una silueta válida y dentro de los límites del tablero para los 50 países', () => {
    expect(shapes).toHaveLength(50);
    for (const shape of shapes) {
      expect(shape.outline.length, shape.id).toBeGreaterThanOrEqual(4);
      expect(getTerritoryShapeArea(shape), shape.id).toBeGreaterThan(0.2);

      for (const [x, z] of shape.outline) {
        expect(x, `${shape.id} x=${x}`).toBeGreaterThan(-10.5);
        expect(x, `${shape.id} x=${x}`).toBeLessThan(10.5);
        expect(z, `${shape.id} z=${z}`).toBeGreaterThan(-5.8);
        // Dejar espacio libre para la bandeja de dados en z = 6.15
        expect(z, `${shape.id} z=${z}`).toBeLessThan(5.45);
      }
    }
  });

  it('ningún país tiene aristas que se crucen entre sí (sin auto-intersecciones)', () => {
    for (const shape of shapes) {
      const pts = shape.outline;
      const n = pts.length;
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 2; j < n; j += 1) {
          if (i === 0 && j === n - 1) continue;
          const crosses = segmentsProperlyIntersect(
            pts[i],
            pts[(i + 1) % n],
            pts[j],
            pts[(j + 1) % n],
          );
          expect(crosses, `Auto-intersección en ${shape.id} (aristas ${i}-${j})`).toBe(false);
        }
      }
    }
  });

  it('ningún par de países se solapa entre sí', () => {
    for (let aIdx = 0; aIdx < shapes.length; aIdx += 1) {
      const a = shapes[aIdx];
      for (let bIdx = aIdx + 1; bIdx < shapes.length; bIdx += 1) {
        const b = shapes[bIdx];

        // 1. Ningún vértice de A dentro de B ni viceversa
        for (const p of a.outline) {
          expect(
            pointInPolygon(p, b.outline),
            `Vértice de ${a.id} cae dentro de ${b.id}`,
          ).toBe(false);
        }
        for (const p of b.outline) {
          expect(
            pointInPolygon(p, a.outline),
            `Vértice de ${b.id} cae dentro de ${a.id}`,
          ).toBe(false);
        }

        // 2. Ninguna arista de A cruza una arista de B
        for (let i = 0; i < a.outline.length; i += 1) {
          const a1 = a.outline[i];
          const a2 = a.outline[(i + 1) % a.outline.length];
          for (let j = 0; j < b.outline.length; j += 1) {
            const b1 = b.outline[j];
            const b2 = b.outline[(j + 1) % b.outline.length];
            expect(
              segmentsProperlyIntersect(a1, a2, b1, b2),
              `Bordes solapados entre ${a.id} y ${b.id}`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it('el centro visual (fichas/badge) queda dentro de su país y fuera de los demás', () => {
    for (const shape of shapes) {
      expect(pointInPolygon(shape.center, shape.outline), shape.id).toBe(true);
      for (const other of shapes) {
        if (other.id === shape.id) continue;
        expect(
          pointInPolygon(shape.center, other.outline),
          `${shape.id} dentro de ${other.id}`,
        ).toBe(false);
      }
    }
  });
});
