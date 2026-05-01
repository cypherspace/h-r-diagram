import type { Star } from "../types";

// Hand-curated reference values from SIMBAD / Gaia DR3 / Hipparcos.
// Distances in parsecs, T_eff in kelvin, mV in apparent V mag, bv in
// B-V color index. Coordinates are J2000 in decimal degrees. The
// `wikipedia` field is the en.wikipedia.org page slug.

export type MarkerShape =
  | "circle"
  | "plus"
  | "square"
  | "rhomb"
  | "triangle"
  | "cross";

export interface StarSet {
  id: string;
  label: string;
  description: string;
  markerColor: string;
  markerShape: MarkerShape;
  stars: Star[];
}

// ---- famous stars ----
const FAMOUS: Star[] = [
  {
    id: "sirius-a",
    name: "Sirius A",
    ra: 101.287, dec: -16.716,
    mV: -1.46, distancePc: 2.64, teff: 9940, bv: 0.0,
    spectralType: "A1V",
    wikipedia: "Sirius",
  },
  {
    id: "vega",
    name: "Vega",
    ra: 279.234, dec: 38.784,
    mV: 0.03, distancePc: 7.68, teff: 9602, bv: 0.0,
    spectralType: "A0V",
    wikipedia: "Vega",
  },
  {
    id: "polaris",
    name: "Polaris",
    ra: 37.954, dec: 89.264,
    mV: 1.98, distancePc: 132.6, teff: 6015, bv: 0.64,
    spectralType: "F7Ib",
    wikipedia: "Polaris",
  },
  {
    id: "capella",
    name: "Capella",
    ra: 79.172, dec: 45.998,
    mV: 0.08, distancePc: 12.94, teff: 4970, bv: 0.80,
    spectralType: "G3III + G8III",
    wikipedia: "Capella",
  },
  {
    id: "procyon-a",
    name: "Procyon A",
    ra: 114.826, dec: 5.225,
    mV: 0.34, distancePc: 3.51, teff: 6530, bv: 0.42,
    spectralType: "F5IV-V",
    wikipedia: "Procyon",
  },
  {
    id: "altair",
    name: "Altair",
    ra: 297.696, dec: 8.868,
    mV: 0.77, distancePc: 5.13, teff: 7550, bv: 0.22,
    spectralType: "A7V",
    wikipedia: "Altair",
  },
  {
    id: "deneb",
    name: "Deneb",
    ra: 310.358, dec: 45.280,
    mV: 1.25, distancePc: 802, teff: 8525, bv: 0.09,
    spectralType: "A2Ia",
    wikipedia: "Deneb",
  },
  {
    id: "canopus",
    name: "Canopus",
    ra: 95.988, dec: -52.696,
    mV: -0.74, distancePc: 95.0, teff: 7350, bv: 0.15,
    spectralType: "A9II",
    wikipedia: "Canopus",
  },
  {
    id: "pollux",
    name: "Pollux",
    ra: 116.328, dec: 28.026,
    mV: 1.14, distancePc: 10.36, teff: 4666, bv: 1.00,
    spectralType: "K0III",
    wikipedia: "Pollux_(star)",
  },
  {
    id: "castor",
    name: "Castor",
    ra: 113.650, dec: 31.888,
    mV: 1.58, distancePc: 15.6, teff: 9500, bv: 0.03,
    spectralType: "A1V + A2Vm",
    wikipedia: "Castor_(star)",
  },
];

// ---- sun-like stars ----
const SUN_LIKE: Star[] = [
  {
    id: "sun",
    name: "Sun",
    ra: 0, dec: 0,
    mV: -26.74, distancePc: 4.848e-6, teff: 5778, bv: 0.65,
    spectralType: "G2V",
    wikipedia: "Sun",
  },
  {
    id: "alpha-cen-a",
    name: "Alpha Centauri A",
    ra: 219.902, dec: -60.834,
    mV: 0.01, distancePc: 1.34, teff: 5790, bv: 0.71,
    spectralType: "G2V",
    wikipedia: "Alpha_Centauri",
  },
  {
    id: "tau-ceti",
    name: "Tau Ceti",
    ra: 26.017, dec: -15.937,
    mV: 3.50, distancePc: 3.65, teff: 5344, bv: 0.72,
    spectralType: "G8V",
    wikipedia: "Tau_Ceti",
  },
  {
    id: "epsilon-eridani",
    name: "Epsilon Eridani",
    ra: 53.233, dec: -9.458,
    mV: 3.73, distancePc: 3.22, teff: 5084, bv: 0.88,
    spectralType: "K2V",
    wikipedia: "Epsilon_Eridani",
  },
  {
    id: "18-sco",
    name: "18 Scorpii",
    ra: 243.687, dec: -8.372,
    mV: 5.50, distancePc: 14.2, teff: 5810, bv: 0.65,
    spectralType: "G2Va",
    notes: "Often called the Sun's stellar twin.",
    wikipedia: "18_Scorpii",
  },
  {
    id: "51-peg",
    name: "51 Pegasi",
    ra: 344.367, dec: 20.769,
    mV: 5.49, distancePc: 15.6, teff: 5793, bv: 0.67,
    spectralType: "G2IV",
    notes: "First sun-like star known to host an exoplanet.",
    wikipedia: "51_Pegasi",
  },
  {
    id: "eta-cas-a",
    name: "Eta Cassiopeiae A",
    ra: 12.276, dec: 57.815,
    mV: 3.45, distancePc: 5.95, teff: 6087, bv: 0.59,
    spectralType: "G0V",
    wikipedia: "Eta_Cassiopeiae",
  },
  {
    id: "beta-com",
    name: "Beta Comae Berenices",
    ra: 197.968, dec: 27.878,
    mV: 4.26, distancePc: 9.13, teff: 5970, bv: 0.59,
    spectralType: "F9.5V",
    wikipedia: "Beta_Comae_Berenices",
  },
];

// ---- red dwarfs ----
const RED_DWARFS: Star[] = [
  {
    id: "proxima-cen",
    name: "Proxima Centauri",
    ra: 217.429, dec: -62.679,
    mV: 11.13, distancePc: 1.30, teff: 3042, bv: 1.83,
    spectralType: "M5.5Ve",
    wikipedia: "Proxima_Centauri",
  },
  {
    id: "barnards-star",
    name: "Barnard's Star",
    ra: 269.452, dec: 4.668,
    mV: 9.51, distancePc: 1.83, teff: 3134, bv: 1.74,
    spectralType: "M4V",
    wikipedia: "Barnard%27s_Star",
  },
  {
    id: "wolf-359",
    name: "Wolf 359",
    ra: 164.103, dec: 7.015,
    mV: 13.54, distancePc: 2.41, teff: 2800, bv: 2.0,
    spectralType: "M6V",
    wikipedia: "Wolf_359",
  },
  {
    id: "lalande-21185",
    name: "Lalande 21185",
    ra: 165.834, dec: 35.969,
    mV: 7.52, distancePc: 2.55, teff: 3601, bv: 1.50,
    spectralType: "M2V",
    wikipedia: "Lalande_21185",
  },
  {
    id: "ross-154",
    name: "Ross 154",
    ra: 282.456, dec: -23.836,
    mV: 10.43, distancePc: 2.97, teff: 3340, bv: 1.69,
    spectralType: "M3.5V",
    wikipedia: "Ross_154",
  },
  {
    id: "ross-248",
    name: "Ross 248",
    ra: 355.470, dec: 44.176,
    mV: 12.29, distancePc: 3.16, teff: 2800, bv: 1.91,
    spectralType: "M5.5V",
    wikipedia: "Ross_248",
  },
  {
    id: "ross-128",
    name: "Ross 128",
    ra: 176.937, dec: 0.804,
    mV: 11.13, distancePc: 3.37, teff: 3192, bv: 1.75,
    spectralType: "M4V",
    wikipedia: "Ross_128",
  },
  {
    id: "lacaille-8760",
    name: "Lacaille 8760",
    ra: 319.314, dec: -38.867,
    mV: 6.67, distancePc: 3.97, teff: 3800, bv: 1.40,
    spectralType: "M0V",
    wikipedia: "Lacaille_8760",
  },
];

// ---- white dwarfs ----
const WHITE_DWARFS: Star[] = [
  {
    id: "sirius-b",
    name: "Sirius B",
    ra: 101.287, dec: -16.716,
    mV: 8.44, distancePc: 2.64, teff: 25000, bv: -0.03,
    spectralType: "DA2",
    notes: "Companion to Sirius; the brightest white dwarf.",
    wikipedia: "Sirius#Sirius_B",
  },
  {
    id: "procyon-b",
    name: "Procyon B",
    ra: 114.826, dec: 5.225,
    mV: 10.7, distancePc: 3.51, teff: 7740, bv: 0.0,
    spectralType: "DQZ",
    wikipedia: "Procyon#Procyon_B",
  },
  {
    id: "40-eri-b",
    name: "40 Eridani B",
    ra: 63.818, dec: -7.652,
    mV: 9.52, distancePc: 4.98, teff: 16500, bv: 0.04,
    spectralType: "DA2.9",
    wikipedia: "40_Eridani",
  },
  {
    id: "van-maanen-2",
    name: "Van Maanen 2",
    ra: 7.787, dec: 5.388,
    mV: 12.37, distancePc: 4.31, teff: 6220, bv: 0.55,
    spectralType: "DZ8",
    notes: "First isolated white dwarf discovered (1917).",
    wikipedia: "Van_Maanen_2",
  },
  {
    id: "stein-2051-b",
    name: "Stein 2051 B",
    ra: 73.123, dec: 58.973,
    mV: 12.4, distancePc: 5.52, teff: 7100, bv: 0.24,
    spectralType: "DC5",
    wikipedia: "Stein_2051",
  },
  {
    id: "wolf-28",
    name: "Wolf 28 (Van Maanen's Star B)",
    ra: 7.787, dec: 5.388,
    mV: 12.37, distancePc: 4.31, teff: 6200, bv: 0.55,
    spectralType: "DZ8",
    wikipedia: "Van_Maanen_2",
  },
  {
    id: "gd-358",
    name: "GD 358",
    ra: 244.158, dec: 32.272,
    mV: 13.65, distancePc: 42.7, teff: 24937, bv: -0.18,
    spectralType: "DBV",
    notes: "Pulsating helium-atmosphere white dwarf.",
    wikipedia: "GD_358",
  },
  {
    id: "g29-38",
    name: "G29-38",
    ra: 354.158, dec: 5.247,
    mV: 13.05, distancePc: 17.5, teff: 11820, bv: 0.18,
    spectralType: "DAV",
    notes: "First white dwarf with a debris disk.",
    wikipedia: "G_29-38",
  },
];

// ---- red giants and supergiants ----
const RED_GIANTS: Star[] = [
  {
    id: "aldebaran",
    name: "Aldebaran",
    ra: 68.980, dec: 16.509,
    mV: 0.86, distancePc: 20.0, teff: 3910, bv: 1.54,
    spectralType: "K5III",
    wikipedia: "Aldebaran",
  },
  {
    id: "arcturus",
    name: "Arcturus",
    ra: 213.915, dec: 19.182,
    mV: -0.05, distancePc: 11.26, teff: 4286, bv: 1.23,
    spectralType: "K1.5III",
    wikipedia: "Arcturus",
  },
  {
    id: "antares",
    name: "Antares",
    ra: 247.352, dec: -26.432,
    mV: 1.06, distancePc: 170, teff: 3660, bv: 1.83,
    spectralType: "M1.5Iab-Ib",
    wikipedia: "Antares",
  },
  {
    id: "betelgeuse",
    name: "Betelgeuse",
    ra: 88.793, dec: 7.407,
    mV: 0.42, distancePc: 168, teff: 3600, bv: 1.85,
    spectralType: "M1-2 Ia-Iab",
    notes: "Variable; mV is approximate.",
    wikipedia: "Betelgeuse",
  },
  {
    id: "mira",
    name: "Mira",
    ra: 34.837, dec: -2.978,
    mV: 6.50, distancePc: 92, teff: 3192, bv: 1.45,
    spectralType: "M7IIIe",
    notes: "Pulsating variable: mV swings from ~3 to ~10.",
    wikipedia: "Mira",
  },
  {
    id: "mu-cep",
    name: "Mu Cephei (Garnet Star)",
    ra: 327.808, dec: 58.780,
    mV: 4.04, distancePc: 940, teff: 3690, bv: 2.35,
    spectralType: "M2Ia",
    notes: "One of the largest known stars; deep red.",
    wikipedia: "Mu_Cephei",
  },
  {
    id: "vy-cma",
    name: "VY Canis Majoris",
    ra: 110.738, dec: -25.768,
    mV: 7.95, distancePc: 1170, teff: 3490, bv: 2.32,
    spectralType: "M3-M4 II/III",
    notes: "Hypergiant; among the largest stars known.",
    wikipedia: "VY_Canis_Majoris",
  },
  {
    id: "r-doradus",
    name: "R Doradus",
    ra: 69.190, dec: -62.078,
    mV: 5.40, distancePc: 55, teff: 2740, bv: 1.59,
    spectralType: "M8III",
    notes: "Has the largest known angular diameter after the Sun.",
    wikipedia: "R_Doradus",
  },
];

// ---- blue giants ----
const BLUE_GIANTS: Star[] = [
  {
    id: "rigel",
    name: "Rigel",
    ra: 78.634, dec: -8.202,
    mV: 0.13, distancePc: 264.6, teff: 12100, bv: -0.03,
    spectralType: "B8Ia",
    wikipedia: "Rigel",
  },
  {
    id: "spica",
    name: "Spica",
    ra: 201.298, dec: -11.161,
    mV: 0.98, distancePc: 77.0, teff: 22400, bv: -0.24,
    spectralType: "B1V",
    wikipedia: "Spica",
  },
  {
    id: "bellatrix",
    name: "Bellatrix",
    ra: 81.282, dec: 6.349,
    mV: 1.64, distancePc: 77.0, teff: 21800, bv: -0.21,
    spectralType: "B2III",
    wikipedia: "Bellatrix",
  },
  {
    id: "achernar",
    name: "Achernar",
    ra: 24.428, dec: -57.236,
    mV: 0.46, distancePc: 42.75, teff: 14500, bv: -0.16,
    spectralType: "B6Vep",
    wikipedia: "Achernar",
  },
  {
    id: "mintaka",
    name: "Mintaka",
    ra: 83.001, dec: -0.299,
    mV: 2.23, distancePc: 380, teff: 29500, bv: -0.18,
    spectralType: "O9.5II",
    notes: "Westernmost star of Orion's Belt.",
    wikipedia: "Mintaka",
  },
  {
    id: "alnitak",
    name: "Alnitak",
    ra: 85.190, dec: -1.943,
    mV: 1.74, distancePc: 250, teff: 29500, bv: -0.21,
    spectralType: "O9.5Iab",
    notes: "Easternmost star of Orion's Belt.",
    wikipedia: "Alnitak",
  },
  {
    id: "saiph",
    name: "Saiph",
    ra: 86.939, dec: -9.670,
    mV: 2.06, distancePc: 198.0, teff: 26500, bv: -0.17,
    spectralType: "B0.5Iab",
    wikipedia: "Saiph",
  },
  {
    id: "regulus",
    name: "Regulus",
    ra: 152.093, dec: 11.967,
    mV: 1.40, distancePc: 24.3, teff: 12460, bv: -0.11,
    spectralType: "B8IVn",
    wikipedia: "Regulus",
  },
];

export const STAR_SETS: StarSet[] = [
  {
    id: "famous",
    label: "Famous stars",
    description:
      "Bright, easy-to-spot stars from the night sky.",
    markerColor: "#ffd166",
    markerShape: "circle",
    stars: FAMOUS,
  },
  {
    id: "sun-like",
    label: "Sun-like stars",
    description:
      "Stars similar to our Sun in size and temperature.",
    markerColor: "#fff1a0",
    markerShape: "rhomb",
    stars: SUN_LIKE,
  },
  {
    id: "red-dwarfs",
    label: "Red dwarfs",
    description:
      "Small, cool, faint stars — the most common kind in the galaxy.",
    markerColor: "#ff7a59",
    markerShape: "triangle",
    stars: RED_DWARFS,
  },
  {
    id: "white-dwarfs",
    label: "White dwarfs",
    description:
      "Tiny, hot leftover cores from stars that have died.",
    markerColor: "#e8eefc",
    markerShape: "square",
    stars: WHITE_DWARFS,
  },
  {
    id: "red-giants",
    label: "Red giants & supergiants",
    description:
      "Huge cool stars — many of the brightest stars in the night sky.",
    markerColor: "#ff5a3c",
    markerShape: "circle",
    stars: RED_GIANTS,
  },
  {
    id: "blue-giants",
    label: "Blue giants",
    description:
      "Massive, hot, bright blue stars that burn fast and die young.",
    markerColor: "#7ec8ff",
    markerShape: "cross",
    stars: BLUE_GIANTS,
  },
];

export const SAMPLE_STARS: Star[] = STAR_SETS.flatMap((s) => s.stars);

export function findStarById(id: string): Star | undefined {
  for (const set of STAR_SETS) {
    const s = set.stars.find((x) => x.id === id);
    if (s) return s;
  }
  return undefined;
}

export function findSetForStar(id: string): StarSet | undefined {
  for (const set of STAR_SETS) {
    if (set.stars.some((s) => s.id === id)) return set;
  }
  return undefined;
}
