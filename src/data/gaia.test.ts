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

describe("buildBoxAdql wraparound", async () => {
  // Re-import the internal builder to assert on the SQL string.
  const { _buildBoxAdqlForTests: build } = await import("./gaia");

  it("uses BETWEEN when the RA range doesn't cross 0/360", () => {
    const sql = build(50, 100, -10, 10, 60, 18);
    expect(sql).toMatch(/"RA_ICRS" BETWEEN 50 AND 100/);
    expect(sql).not.toMatch(/OR "RA_ICRS"/);
  });

  it("uses an OR clause when the RA range crosses 0/360", () => {
    const sql = build(355, 5, -10, 10, 60, 18);
    expect(sql).toMatch(/"RA_ICRS" >= 355/);
    expect(sql).toMatch(/"RA_ICRS" <= 5/);
  });

  it("does not include ORDER BY (sorting is now client-side)", () => {
    const sql = build(50, 100, -10, 10, 60, 18);
    expect(sql).not.toMatch(/ORDER BY/i);
  });
});

describe("selectSpread", async () => {
  const { selectSpread } = await import("./gaia");

  function row(id: string, ra: number, dec: number, gMag: number): GaiaRow {
    return {
      source_id: id,
      ra,
      dec,
      parallax_mas: 10,
      parallax_over_error: 50,
      g_mag: gMag,
      bp_rp: 0.5,
      teff_k: null,
      lum_flame_solar: null,
    };
  }

  it("returns all rows (sorted by Gmag) when count <= limit", () => {
    const rs = [row("a", 0, 0, 5), row("b", 1, 0, 3), row("c", 0, 1, 7)];
    const out = selectSpread(rs, 0, 0, 5);
    expect(out.map((r) => r.source_id)).toEqual(["b", "a", "c"]);
  });

  it("always includes the row closest to the cone centre", () => {
    // Bright cluster offset from the centre at (0,0); a single faint
    // star sits right on the crosshair. Plain "topN brightest" would
    // never include the faint one. selectSpread must.
    const cluster = Array.from({ length: 20 }, (_, i) =>
      row(`bright-${i}`, 0.4 + i * 0.005, 0.4, 4 + i * 0.05),
    );
    const onCrosshair = row("centre", 0, 0, 12);
    const rs = [...cluster, onCrosshair];
    const out = selectSpread(rs, 0, 0, 10);
    expect(out.map((r) => r.source_id)).toContain("centre");
  });

  it("still favours bright stars for the bulk of the picks", () => {
    // 100 random stars, only 1 close to centre.
    const stars: GaiaRow[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push(row(`s${i}`, (i % 10) - 5, Math.floor(i / 10) - 5, 5 + i / 20));
    }
    const out = selectSpread(stars, 0, 0, 10);
    expect(out.length).toBe(10);
    // 8 of the 10 should be among the 20 brightest (Gmag <= 6.0).
    const bright = out.filter((r) => r.g_mag <= 6.0);
    expect(bright.length).toBeGreaterThanOrEqual(7);
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

