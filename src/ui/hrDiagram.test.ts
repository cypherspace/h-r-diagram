import { describe, expect, it } from "vitest";
import { formatLuminosityTick } from "./hrDiagram";

describe("formatLuminosityTick", () => {
  it("formats decade values in solar units as plain numbers", () => {
    expect(formatLuminosityTick(1, "decimals", "solar")).toBe("1");
    expect(formatLuminosityTick(10, "decimals", "solar")).toBe("10");
    expect(formatLuminosityTick(100, "decimals", "solar")).toBe("100");
    expect(formatLuminosityTick(0.1, "decimals", "solar")).toBe("0.1");
    expect(formatLuminosityTick(0.01, "decimals", "solar")).toBe("0.01");
  });

  it("formats fractions as 1/N for sub-solar luminosities", () => {
    expect(formatLuminosityTick(1, "fractions", "solar")).toBe("1");
    expect(formatLuminosityTick(0.1, "fractions", "solar")).toBe("1/10");
    expect(formatLuminosityTick(0.01, "fractions", "solar")).toBe("1/100");
    expect(formatLuminosityTick(10, "fractions", "solar")).toBe("10");
    expect(formatLuminosityTick(1000, "fractions", "solar")).toBe("1000");
  });

  it("formats powers-of-ten with Unicode superscripts", () => {
    expect(formatLuminosityTick(1, "powers", "solar")).toBe("10⁰");
    expect(formatLuminosityTick(10, "powers", "solar")).toBe("10¹");
    expect(formatLuminosityTick(100, "powers", "solar")).toBe("10²");
    expect(formatLuminosityTick(0.1, "powers", "solar")).toBe("10⁻¹");
    expect(formatLuminosityTick(0.001, "powers", "solar")).toBe("10⁻³");
  });

  it("formats watts as powers of ten with W suffix", () => {
    // 1 L_sun = 3.828e26 W ≈ 10^26.583 — not a decade in watts.
    // The intermediate decade values in solar that map cleanly are:
    //   10^x in solar → log10(x * 3.828e26) in watts; only round when
    //   x = 10^(integer - 26.583).
    // For our scale-domain ticks (1e-4 .. 1e6 in solar), the watts
    // values are 3.83e22 .. 3.83e32 — not decade-aligned. So most ticks
    // get blanked. That's fine for the diagram.
    // Verify a value that IS a watts decade: 1e-26.583 solar units.
    const solarOf1e26W = 1e26 / 3.828e26;
    const result = formatLuminosityTick(solarOf1e26W, "powers", "watts");
    expect(result).toBe("10²⁶ W");
  });

  it("returns empty for non-decade ticks in non-decimal modes", () => {
    expect(formatLuminosityTick(2, "powers", "solar")).toBe("");
    expect(formatLuminosityTick(5, "fractions", "solar")).toBe("");
  });

  it("handles non-finite or zero gracefully", () => {
    expect(formatLuminosityTick(0, "decimals", "solar")).toBe("");
    expect(formatLuminosityTick(NaN, "decimals", "solar")).toBe("");
    expect(formatLuminosityTick(-1, "decimals", "solar")).toBe("");
  });
});
