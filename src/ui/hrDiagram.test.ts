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

  it("labels watts ticks at solar decades using 3.83 × 10^N (no unit)", () => {
    // Watts mode reuses the solar scale's tick positions (1, 10, 100,
    // … L☉) and labels each with its watts equivalent. 1 L☉ ≈
    // 3.828 × 10²⁶ W, so each solar decade is one decade of watts
    // (the "3.83" prefix doesn't change). The "W" unit is supplied by
    // the y-axis label, not on every tick.
    expect(formatLuminosityTick(1, "decimals", "watts")).toBe("3.83 × 10²⁶");
    expect(formatLuminosityTick(10, "decimals", "watts")).toBe("3.83 × 10²⁷");
    expect(formatLuminosityTick(0.01, "decimals", "watts")).toBe("3.83 × 10²⁴");
    expect(formatLuminosityTick(1e6, "decimals", "watts")).toBe("3.83 × 10³²");
    expect(formatLuminosityTick(1, "powers", "watts")).toBe("3.83 × 10²⁶");
  });
  it("blanks non-decade ticks in watts mode", () => {
    expect(formatLuminosityTick(2, "decimals", "watts")).toBe("");
    expect(formatLuminosityTick(50, "decimals", "watts")).toBe("");
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
