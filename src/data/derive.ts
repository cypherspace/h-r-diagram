import type { PlottedStar, Star } from "../types";

export const M_V_SUN = 4.83;

export function absoluteMagnitude(mV: number, distancePc: number): number {
  if (distancePc <= 0) throw new Error("distance must be positive");
  return mV - 5 * Math.log10(distancePc / 10);
}

export function luminositySolar(absMagV: number, bolometricCorrection = 0): number {
  const mBol = absMagV + bolometricCorrection;
  return Math.pow(10, (M_V_SUN - mBol) / 2.5);
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
  return {
    ...star,
    absMag,
    luminositySolar: luminositySolar(absMag),
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
