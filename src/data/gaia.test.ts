import { describe, expect, it } from "vitest";
import {
  _parseCsvForTests as parseCsv,
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
  lum_flame_solar: null,
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
    // Sun has BP-RP ~ 0.82; expect T_eff ~ 5778 K.
    const row = { ...sampleRow, teff_k: null, bp_rp: 0.82 };
    const star = gaiaRowToStar(row);
    expect(star.teff).toBeGreaterThan(5400);
    expect(star.teff!).toBeLessThan(6100);
    expect(star.notes).toContain("estimated");
    expect(star.teffSource).toBe("derived");
  });
  it("uses the published Teff directly when present", () => {
    const row = { ...sampleRow, teff_k: 4321, bp_rp: 0.82 };
    const star = gaiaRowToStar(row);
    // Must equal exactly the published value, not a BP-RP derivation.
    expect(star.teff).toBe(4321);
    expect(star.teffSource).toBe("published");
  });
  it("uses the published luminosity when present", () => {
    const row = { ...sampleRow, lum_flame_solar: 12.34 };
    const star = gaiaRowToStar(row);
    expect(star.luminosity).toBe(12.34);
    expect(star.luminositySource).toBe("published");
  });
  it("returns a star without teff when neither published Teff nor BP-RP is given", () => {
    const row = { ...sampleRow, teff_k: null, bp_rp: null };
    const star = gaiaRowToStar(row);
    expect(star.teff).toBeUndefined();
    expect(star.notes).toMatch(/unknown/i);
    // plotStar should refuse such a star.
    expect(() => plotStar(star)).toThrow();
  });
  it("plots into a sensible H-R region for an A-type star", () => {
    const star = plotStar(gaiaRowToStar(sampleRow));
    expect(star.luminositySolar).toBeGreaterThan(10);
    expect(star.luminositySolar).toBeLessThan(50);
  });
});

describe("parseCsv", () => {
  // The production cone/box query returns un-aliased gaiadr3 column
  // names (Source / RA_ICRS / DE_ICRS / Plx / e_Plx / Gmag / bprp). The
  // teff/lum-flame fields are populated by a separate paramsup query.
  it("preserves source_id from the un-aliased gaiadr3 header", () => {
    const csv = [
      "Source,RA_ICRS,DE_ICRS,Plx,e_Plx,Gmag,bprp",
      "1234567890,101.287,-16.716,379.21,1.9,1.46,0.0",
      "9876543210,250.4,-26.7,5.5,0.5,12.1,1.2",
    ].join("\n");
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].source_id).toBe("1234567890");
    expect(rows[0].parallax_mas).toBeCloseTo(379.21, 5);
    expect(rows[0].teff_k).toBeNull();
    expect(rows[0].lum_flame_solar).toBeNull();
    expect(rows[1].source_id).toBe("9876543210");
  });
  it("also accepts aliased headers (forward-compat for future joins)", () => {
    const csv = [
      "source_id,ra,dec,plx,e_plx,gmag,bprp",
      "1234567890,101.287,-16.716,379.21,1.9,1.46,0.0",
    ].join("\n");
    const rows = parseCsv(csv);
    expect(rows[0].source_id).toBe("1234567890");
  });
  it("skips rows with missing parallax / mag", () => {
    const csv = [
      "Source,RA_ICRS,DE_ICRS,Plx,e_Plx,Gmag,bprp",
      "abc,0,0,,1,5,0.5",
      "def,0,0,5,,5,0.5",
      "ghi,0,0,5,1,,0.5",
    ].join("\n");
    expect(parseCsv(csv)).toHaveLength(0);
  });
});

describe("parseParamsupCsv", () => {
  it("returns a Map keyed by Source", async () => {
    const { parseParamsupCsv } = await import("./gaia");
    const csv = [
      "Source,Teff,lum_flame",
      "1234567890,9940,25.4",
      "9876543210,,",
    ].join("\n");
    const m = parseParamsupCsv(csv);
    expect(m.size).toBe(2);
    expect(m.get("1234567890")?.teff).toBe(9940);
    expect(m.get("1234567890")?.lum).toBeCloseTo(25.4, 3);
    expect(m.get("9876543210")?.teff).toBeNull();
    expect(m.get("9876543210")?.lum).toBeNull();
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

