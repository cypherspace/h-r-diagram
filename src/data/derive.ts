import type { PlottedStar, Star } from "../types";

export const M_V_SUN = 4.83;
// IAU 2015 nominal bolometric absolute magnitude for the Sun.
export const M_BOL_SUN = 4.74;

export function absoluteMagnitude(mV: number, distancePc: number): number {
  if (distancePc <= 0) throw new Error("distance must be positive");
  return mV - 5 * Math.log10(distancePc / 10);
}

// Approximate bolometric correction (mag) as a function of T_eff. Values
// follow Pecaut & Mamajek (2013) for the main sequence with extrapolations
// for cool giants/supergiants and the OB tail. The function piecewise-
// linearly interpolates between the table entries; for an educational
// visualisation this is accurate to ≲ 0.3 mag — fine, given that
// published bolometric luminosities for individual stars are themselves
// uncertain at that level.
const BC_TABLE: ReadonlyArray<readonly [number, number]> = [
  [2200, -4.0],
  [2400, -3.4],
  [2700, -2.6],
  [3000, -2.4],
  [3300, -1.7],
  [3500, -1.4],
  [3800, -1.0],
  [4100, -0.7],
  [4400, -0.5],
  [4700, -0.35],
  [5000, -0.20],
  [5300, -0.13],
  [5600, -0.10],
  [5800, -0.07],
  [6000, -0.06],
  [6500, -0.04],
  [7000, -0.03],
  [7500, 0.0],
  [8000, -0.05],
  [9000, -0.15],
  [10000, -0.30],
  [12000, -0.7],
  [14000, -1.0],
  [16000, -1.4],
  [18000, -1.7],
  [20000, -2.0],
  [25000, -2.5],
  [30000, -2.95],
  [35000, -3.3],
  [40000, -3.5],
  [50000, -4.0],
];

export function bolometricCorrection(teffK: number): number {
  if (teffK <= BC_TABLE[0][0]) return BC_TABLE[0][1];
  const last = BC_TABLE[BC_TABLE.length - 1];
  if (teffK >= last[0]) return last[1];
  for (let i = 0; i < BC_TABLE.length - 1; i++) {
    const [t1, bc1] = BC_TABLE[i];
    const [t2, bc2] = BC_TABLE[i + 1];
    if (teffK >= t1 && teffK <= t2) {
      const f = (teffK - t1) / (t2 - t1);
      return bc1 + f * (bc2 - bc1);
    }
  }
  return 0;
}

// Bolometric solar luminosity from V-band absolute magnitude. If T_eff
// is given, applies a bolometric correction so cool red and hot blue
// stars don't get systematically under-counted (their energy spills into
// IR / UV, missing the V band). Without T_eff this falls back to the
// V-band-only formula, which is only correct for F/G/K main-sequence
// stars where BC ≈ 0.
export function luminositySolar(absMagV: number, teffK?: number): number {
  const bc = teffK != null ? bolometricCorrection(teffK) : 0;
  const mBol = absMagV + bc;
  return Math.pow(10, (M_BOL_SUN - mBol) / 2.5);
}

// Ballesteros 2012, valid for main-sequence stars roughly 3000-10000 K.
export function tempFromBV(bv: number): number {
  return (
    4600 *
    (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))
  );
}

export function bvFromTemp(teff: number): number {
  // Numerical inversion of Ballesteros via bisection.
  let lo = -0.4;
  let hi = 2.5;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const t = tempFromBV(mid);
    if (t > teff) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function plotStar(star: Star): PlottedStar {
  const absMag = absoluteMagnitude(star.mV, star.distancePc);
  // Prefer a published bolometric luminosity if the curated record has
  // one; otherwise compute from m_V using the BC table.
  const lum = star.luminosity ?? luminositySolar(absMag, star.teff);
  return {
    ...star,
    absMag,
    luminositySolar: lum,
  };
}

// Approximate the visible colour of a black body at temperature T_eff,
// returned as an [r, g, b] triple in 0..255. Uses Tanner Helland's
// piecewise fit (https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html),
// which is calibrated against integrating Planck's law over the CIE
// colour matching functions and gives perceptually-good colours from
// roughly 1000 K (deep red) to 40 000 K (blue-white). Sufficient for
// visualisation; not a physically rigorous radiative transfer.
export function blackbodyRgb(tempK: number): [number, number, number] {
  const t = clamp(tempK, 1000, 40000) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (t <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
  }

  if (t <= 66) {
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }

  if (t >= 66) {
    b = 255;
  } else if (t <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  }

  return [
    Math.round(clamp(r, 0, 255)),
    Math.round(clamp(g, 0, 255)),
    Math.round(clamp(b, 0, 255)),
  ];
}

export function blackbodyColor(tempK: number): string {
  const [r, g, b] = blackbodyRgb(tempK);
  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ---- spectral classification ----

// Standard Morgan-Keenan boundaries (upper temperature for each class).
// Anything hotter than the O floor is still O.
const MK_BOUNDS: Array<{ letter: string; min: number; max: number }> = [
  { letter: "O", min: 30000, max: 60000 },
  { letter: "B", min: 10000, max: 30000 },
  { letter: "A", min: 7500, max: 10000 },
  { letter: "F", min: 6000, max: 7500 },
  { letter: "G", min: 5200, max: 6000 },
  { letter: "K", min: 3700, max: 5200 },
  { letter: "M", min: 2400, max: 3700 },
];

// Map T_eff to a Morgan-Keenan class with subclass digit (e.g. "G2",
// "M5"). The digit is interpolated linearly inside the class range
// where 0 = hottest end and 9 = coolest end. If absMagV is provided,
// append a luminosity class hint:
//   M_V > 10 and T_eff > 7000 -> "D" (white dwarf)
//   M_V < -2                  -> "I" (supergiant)
//   M_V < 1 and T_eff < 5500  -> "III" (giant)
//   else                      -> "V" (main sequence)
// All of this is heuristic and intended only for visualisation; rows
// with derived classes should be marked "(estimated)" in the UI.
export function deriveSpectralType(teff: number, absMagV?: number): string {
  const t = clamp(teff, 1000, 60000);

  let letter = "M";
  let min = MK_BOUNDS[MK_BOUNDS.length - 1].min;
  let max = MK_BOUNDS[MK_BOUNDS.length - 1].max;
  for (const b of MK_BOUNDS) {
    if (t >= b.min && t <= b.max) {
      letter = b.letter;
      min = b.min;
      max = b.max;
      break;
    }
    if (t > b.max && b.letter === "O") {
      letter = "O";
      min = b.min;
      max = b.max;
      break;
    }
  }
  // Subclass: 0 at the hot end (max), 9 at the cool end (min).
  const frac = (max - t) / (max - min);
  const digit = clamp(Math.round(frac * 9), 0, 9);
  const main = `${letter}${digit}`;

  if (absMagV == null || !Number.isFinite(absMagV)) return main;

  let lumClass: string;
  if (absMagV > 10 && teff > 7000) {
    lumClass = `D${letter}`; // white-dwarf style label
    return `${main} (white dwarf, ≈${lumClass})`;
  } else if (absMagV < -2) {
    lumClass = "I";
  } else if (absMagV < 1 && teff < 5500) {
    lumClass = "III";
  } else {
    lumClass = "V";
  }
  return `${main}${lumClass}`;
}

// ---- Kelvin <-> Celsius ----
export function kelvinToCelsius(k: number): number {
  return k - 273.15;
}

// ---- ordinal "named colour" axis ----

// Spectral-class temperature boundaries, in K, from hot (O) to cool (M).
// These are the standard Morgan-Keenan boundaries; the index of the
// boundary corresponds to the position of the class on the axis.
const COLOUR_BOUNDARIES: ReadonlyArray<number> = [
  60000, // hotter than O
  30000, // O / B
  10000, // B / A
  7500, // A / F
  6000, // F / G
  5200, // G / K
  3700, // K / M
  1500, // M / cooler
];

export const COLOUR_BANDS: ReadonlyArray<{ label: string; spectralLetter: string }> =
  [
    { label: "blue", spectralLetter: "O" },
    { label: "blue-white", spectralLetter: "B" },
    { label: "white", spectralLetter: "A" },
    { label: "yellow-white", spectralLetter: "F" },
    { label: "yellow", spectralLetter: "G" },
    { label: "orange", spectralLetter: "K" },
    { label: "red", spectralLetter: "M" },
  ];

/**
 * Map T_eff to a 0..1 ordinal position where 0 is the hottest end of the
 * O class and 1 is the coolest end of the M class. Inside each spectral
 * class the position varies linearly with T_eff, but each class occupies
 * exactly 1/7 of the axis so the bands look evenly spaced regardless of
 * how wide their actual temperature range is.
 */
export function tempToColourPos(teffK: number): number {
  const N = COLOUR_BOUNDARIES.length - 1; // 7 classes
  if (teffK >= COLOUR_BOUNDARIES[0]) return 0;
  if (teffK <= COLOUR_BOUNDARIES[N]) return 1;
  for (let i = 0; i < N; i++) {
    const hot = COLOUR_BOUNDARIES[i];
    const cool = COLOUR_BOUNDARIES[i + 1];
    if (teffK <= hot && teffK >= cool) {
      const f = (hot - teffK) / (hot - cool);
      return (i + f) / N;
    }
  }
  return 1;
}
