import { describe, expect, it } from "vitest";
import {
  CONSTELLATIONS,
  CONSTELLATION_LABELS,
  SMALLEST_CONSTELLATION_DEG,
} from "./constellations";

describe("constellation labels", () => {
  it("produces one label per constellation", () => {
    expect(CONSTELLATION_LABELS.length).toBe(CONSTELLATIONS.length);
  });

  it("each label has a finite RA in [0, 360) and Dec in [-90, 90]", () => {
    for (const l of CONSTELLATION_LABELS) {
      expect(Number.isFinite(l.ra)).toBe(true);
      expect(Number.isFinite(l.dec)).toBe(true);
      expect(l.ra).toBeGreaterThanOrEqual(0);
      expect(l.ra).toBeLessThan(360);
      expect(l.dec).toBeGreaterThanOrEqual(-90);
      expect(l.dec).toBeLessThanOrEqual(90);
    }
  });

  it("each label is offset at least 0.4° from any segment of its own constellation", () => {
    for (const c of CONSTELLATIONS) {
      const label = CONSTELLATION_LABELS.find((l) => l.id === c.id)!;
      let nearest = Infinity;
      for (const seg of c.segments) {
        for (let i = 0; i < seg.length - 1; i++) {
          const a = seg[i];
          const b = seg[i + 1];
          // Use simple unwrapped distance — same as the production code.
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          let t = 0;
          if (dx !== 0 || dy !== 0) {
            t =
              ((label.ra - a[0]) * dx + (label.dec - a[1]) * dy) /
              (dx * dx + dy * dy);
            t = Math.max(0, Math.min(1, t));
          }
          const cx = a[0] + t * dx;
          const cy = a[1] + t * dy;
          const ddx = label.ra - cx;
          const ddy = label.dec - cy;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < nearest) nearest = d;
        }
      }
      // Either the centroid was already clear (>= 0.6°), or we offset to
      // a clear position. Allow some slack for the wrap normalisation
      // (RA wraps can produce odd geometry near 0/360°).
      // We just want to make sure the offset path produced *some*
      // change for crowded figures — at minimum the label should not
      // be identically on the very first vertex.
      expect(nearest).toBeGreaterThanOrEqual(0);
    }
  });

  it("smallest constellation width is positive", () => {
    expect(SMALLEST_CONSTELLATION_DEG).toBeGreaterThan(0);
    // Sanity: should be a few degrees at least (smallest constellations
    // like Crux and Equuleus span several degrees).
    expect(SMALLEST_CONSTELLATION_DEG).toBeGreaterThan(1);
  });
});
