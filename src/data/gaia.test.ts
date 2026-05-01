import { describe, expect, it } from "vitest";
import {
  distanceFromParallax,
  gaiaRowToStar,
  nearestRow,
  type GaiaRow,
} from "./gaia";
import { plotStar } from "./derive";

const sampleRow: GaiaRow = {
  source_id: "1234567890",
  ra: 101.287,
  dec: -16.716,
  parallax_mas: 379.21, // Sirius-like (379 mas -> 2.64 pc)
  parallax_over_error: 200,
  g_mag: -1.46,
  bp_rp: 0.0,
  teff_k: 9940,
};

describe("distanceFromParallax", () => {
  it("converts 1 mas to 1000 pc", () => {
    expect(distanceFromParallax(1)).toBeCloseTo(1000, 6);
  });
  it("converts 100 mas to 10 pc", () => {
    expect(distanceFromParallax(100)).toBeCloseTo(10, 6);
  });
  it("throws on non-positive parallax", () => {
    expect(() => distanceFromParallax(0)).toThrow();
    expect(() => distanceFromParallax(-1)).toThrow();
  });
});

describe("gaiaRowToStar", () => {
  it("derives a sensible distance from parallax", () => {
    const star = gaiaRowToStar(sampleRow);
    expect(star.distancePc).toBeCloseTo(2.638, 2);
  });
  it("produces stable ids prefixed with gaia-", () => {
    expect(gaiaRowToStar(sampleRow).id).toBe("gaia-1234567890");
  });
  it("falls back to BP-RP-derived T_eff when teff_k is missing", () => {
    const row = { ...sampleRow, teff_k: null, bp_rp: 0.65 };
    const star = gaiaRowToStar(row);
    expect(star.teff).toBeGreaterThan(5500);
    expect(star.teff).toBeLessThan(5900);
    expect(star.notes).toContain("estimated");
  });
  it("plots into a sensible H-R region for an A-type star", () => {
    const star = plotStar(gaiaRowToStar(sampleRow));
    expect(star.luminositySolar).toBeGreaterThan(10);
    expect(star.luminositySolar).toBeLessThan(50);
  });
});

describe("nearestRow", () => {
  it("returns the row closest to the given coordinates", () => {
    const rows: GaiaRow[] = [
      { ...sampleRow, source_id: "a", ra: 100, dec: 0 },
      { ...sampleRow, source_id: "b", ra: 100.01, dec: 0.01 },
      { ...sampleRow, source_id: "c", ra: 101, dec: 1 },
    ];
    const r = nearestRow(rows, 100.005, 0.005);
    expect(r?.source_id).toBe("b");
  });
  it("returns undefined for an empty list", () => {
    expect(nearestRow([], 0, 0)).toBeUndefined();
  });
});
