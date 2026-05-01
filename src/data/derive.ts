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
