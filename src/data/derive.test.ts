import { describe, expect, it } from "vitest";
import {
  M_V_SUN,
  absoluteMagnitude,
  blackbodyRgb,
  bvFromTemp,
  deriveSpectralType,
  kelvinToCelsius,
  luminositySolar,
  plotStar,
  tempFromBV,
} from "./derive";
import { findStarById } from "./sampleStars";

describe("absoluteMagnitude", () => {
  it("returns the apparent magnitude when distance is 10 pc", () => {
    expect(absoluteMagnitude(5, 10)).toBeCloseTo(5, 10);
  });

  it("recovers the Sun's M_V from its m_V and 1 AU distance", () => {
    const d = 4.848e-6; // 1 AU in pc
    expect(absoluteMagnitude(-26.74, d)).toBeCloseTo(M_V_SUN, 1);
  });

  it("throws on non-positive distance", () => {
    expect(() => absoluteMagnitude(0, 0)).toThrow();
  });
});

describe("luminositySolar", () => {
  it("gives 1 L_sun for the Sun's M_V", () => {
    expect(luminositySolar(M_V_SUN)).toBeCloseTo(1, 10);
  });

  it("scales by 100 for a 5-mag brighter star", () => {
    expect(luminositySolar(M_V_SUN - 5)).toBeCloseTo(100, 5);
  });
});

describe("tempFromBV / bvFromTemp", () => {
  it("returns ~5778 K for the Sun's B-V = 0.65", () => {
    expect(tempFromBV(0.65)).toBeGreaterThan(5500);
    expect(tempFromBV(0.65)).toBeLessThan(5900);
  });

  it("is monotonically decreasing in B-V over the valid range", () => {
    let prev = tempFromBV(-0.3);
    for (let bv = -0.25; bv <= 2; bv += 0.1) {
      const t = tempFromBV(bv);
      expect(t).toBeLessThan(prev);
      prev = t;
    }
  });

  it("round-trips approximately", () => {
    for (const bv of [-0.2, 0, 0.5, 1.0, 1.5]) {
      const t = tempFromBV(bv);
      expect(bvFromTemp(t)).toBeCloseTo(bv, 2);
    }
  });
});

describe("blackbodyRgb", () => {
  it("returns a deep red/orange for cool stars (~3000 K)", () => {
    const [r, g, b] = blackbodyRgb(3000);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    expect(r).toBe(255);
  });

  it("returns a roughly white-yellow for sun-like stars (~5800 K)", () => {
    const [r, g, b] = blackbodyRgb(5800);
    expect(r).toBe(255);
    expect(g).toBeGreaterThan(200);
    expect(b).toBeGreaterThan(180);
    expect(b).toBeLessThan(r);
  });

  it("returns a blue-white for hot stars (~25000 K)", () => {
    const [r, , b] = blackbodyRgb(25000);
    expect(b).toBe(255);
    expect(b).toBeGreaterThan(r);
  });

  it("clamps very low and very high temperatures", () => {
    const cold = blackbodyRgb(500);
    const hot = blackbodyRgb(100000);
    for (const v of [...cold, ...hot]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });
});

describe("deriveSpectralType", () => {
  it("classifies the Sun as G near 5778 K", () => {
    const s = deriveSpectralType(5778);
    expect(s.startsWith("G")).toBe(true);
  });

  it("classifies a hot star as O or B", () => {
    expect(deriveSpectralType(35000).startsWith("O")).toBe(true);
    expect(deriveSpectralType(20000).startsWith("B")).toBe(true);
  });

  it("classifies an M dwarf", () => {
    expect(deriveSpectralType(3000).startsWith("M")).toBe(true);
  });

  it("appends V for main-sequence absolute magnitudes", () => {
    expect(deriveSpectralType(5778, 4.83)).toMatch(/V$/);
  });

  it("flags white dwarfs when faint and hot", () => {
    expect(deriveSpectralType(15000, 11.2)).toContain("white dwarf");
  });

  it("appends I for supergiants", () => {
    expect(deriveSpectralType(3500, -5.5)).toMatch(/I$/);
  });
});

describe("kelvinToCelsius", () => {
  it("converts standard temperatures correctly", () => {
    expect(kelvinToCelsius(273.15)).toBeCloseTo(0, 5);
    expect(kelvinToCelsius(5778)).toBeCloseTo(5504.85, 2);
  });
});

describe("plotStar reference values", () => {
  it("places the Sun near (5778 K, 1 L_sun)", () => {
    const sun = findStarById("sun")!;
    const plotted = plotStar(sun);
    expect(plotted.luminositySolar).toBeCloseTo(1, 0);
    expect(plotted.absMag).toBeCloseTo(M_V_SUN, 0);
  });

  it("places Sirius A as a luminous A-type star (L > 10 L_sun)", () => {
    const sirius = findStarById("sirius-a")!;
    const plotted = plotStar(sirius);
    expect(plotted.luminositySolar).toBeGreaterThan(10);
    expect(plotted.luminositySolar).toBeLessThan(50);
  });

  it("places Betelgeuse as highly luminous (L > 10000 L_sun)", () => {
    const b = findStarById("betelgeuse")!;
    const plotted = plotStar(b);
    expect(plotted.luminositySolar).toBeGreaterThan(1e4);
  });
});
