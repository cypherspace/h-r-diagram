// Hand-built stick-figures for a curated set of well-known constellations.
// Each segment is a polyline of [RA, Dec] in J2000 decimal degrees.
// Coordinates come from SIMBAD / Hipparcos for the bright stars.
// We ship a subset rather than all 88 IAU constellations to keep the
// bundle small and the visual quiet — students primarily need the
// recognisable shapes that bracket familiar regions of sky.

export interface ConstellationLine {
  name: string;
  segments: Array<Array<[number, number]>>;
}

export const CONSTELLATIONS: ConstellationLine[] = [
  {
    name: "Orion",
    segments: [
      // Belt
      [
        [83.001, -0.299], // Mintaka
        [84.053, -1.202], // Alnilam
        [85.190, -1.943], // Alnitak
      ],
      // Shoulders
      [
        [81.282, 6.349], // Bellatrix
        [88.793, 7.407], // Betelgeuse
      ],
      // Bellatrix to Mintaka
      [
        [81.282, 6.349],
        [83.001, -0.299],
      ],
      // Betelgeuse to Alnitak
      [
        [88.793, 7.407],
        [85.190, -1.943],
      ],
      // Mintaka to Rigel
      [
        [83.001, -0.299],
        [78.634, -8.202], // Rigel
      ],
      // Alnitak to Saiph
      [
        [85.190, -1.943],
        [86.939, -9.670], // Saiph
      ],
      // Sword (Trapezium region, simplified)
      [
        [84.053, -1.202],
        [83.819, -5.387], // Iota Ori
      ],
    ],
  },
  {
    name: "Ursa Major (Big Dipper / Plough)",
    segments: [
      // Bowl
      [
        [165.932, 61.751], // Dubhe
        [165.460, 56.382], // Merak
        [178.458, 53.695], // Phecda
        [183.857, 57.033], // Megrez
        [165.932, 61.751], // back to Dubhe
      ],
      // Handle
      [
        [183.857, 57.033], // Megrez
        [193.507, 55.960], // Alioth
        [200.981, 54.926], // Mizar
        [206.885, 49.313], // Alkaid
      ],
    ],
  },
  {
    name: "Cassiopeia",
    segments: [
      [
        [2.295, 59.150], // Caph (β)
        [10.127, 56.537], // Schedar (α)
        [14.177, 60.717], // Gamma Cas
        [21.454, 60.235], // Ruchbah (δ)
        [28.599, 63.670], // Segin (ε)
      ],
    ],
  },
  {
    name: "Cygnus",
    segments: [
      // Vertical (head to tail of swan)
      [
        [292.681, 27.960], // Albireo (β)
        [305.557, 40.257], // Sadr (γ)
        [310.358, 45.280], // Deneb (α)
      ],
      // Wings
      [
        [296.243, 45.131], // δ Cyg
        [305.557, 40.257], // Sadr
        [311.553, 33.971], // Gienah (ε)
      ],
    ],
  },
  {
    name: "Lyra",
    segments: [
      // Vega connected to the parallelogram
      [
        [279.234, 38.784], // Vega
        [281.193, 37.605], // ζ Lyr
      ],
      // Parallelogram
      [
        [281.193, 37.605], // ζ
        [283.626, 36.899], // δ
        [284.736, 32.690], // γ
        [282.520, 33.363], // β (Sheliak)
        [281.193, 37.605], // back to ζ
      ],
    ],
  },
  {
    name: "Leo",
    segments: [
      // Sickle (the head)
      [
        [141.897, 9.892], // Algieba (γ)
        [146.463, 23.774], // ζ Leo
        [142.493, 26.007], // μ Leo
        [140.262, 23.417], // ε Leo
        [146.310, 16.762], // η Leo
        [141.897, 9.892], // back to Algieba
      ],
      // Body to Denebola
      [
        [152.093, 11.967], // Regulus
        [141.897, 9.892], // Algieba
      ],
      [
        [152.093, 11.967], // Regulus
        [168.527, 20.523], // θ Leo
      ],
      [
        [168.527, 20.523], // θ
        [177.265, 14.572], // Denebola (β)
      ],
      [
        [177.265, 14.572], // Denebola
        [168.560, 15.430], // Chertan (δ)
        [152.093, 11.967], // back to Regulus
      ],
    ],
  },
  {
    name: "Scorpius",
    segments: [
      // Head (claws)
      [
        [240.083, -22.622], // Dschubba (δ)
        [241.359, -19.806], // Acrab (β)
      ],
      [
        [240.083, -22.622], // Dschubba
        [239.713, -26.114], // π Sco
      ],
      // Heart and tail
      [
        [240.083, -22.622], // Dschubba
        [247.352, -26.432], // Antares (α)
        [248.971, -28.216], // τ Sco
        [252.541, -34.293], // ε Sco
        [253.984, -38.048], // μ¹ Sco
        [254.658, -42.362], // ζ² Sco
        [263.402, -37.104], // Shaula (λ)
        [262.690, -37.296], // Lesath (υ)
      ],
    ],
  },
  {
    name: "Crux (Southern Cross)",
    segments: [
      // Vertical
      [
        [187.791, -57.113], // Gacrux (γ)
        [186.650, -63.099], // Acrux (α)
      ],
      // Horizontal
      [
        [183.786, -58.749], // Imai (δ)
        [191.930, -59.689], // Mimosa (β)
      ],
    ],
  },
  {
    name: "Canis Major",
    segments: [
      // Body around Sirius
      [
        [101.287, -16.716], // Sirius (α)
        [104.034, -17.054], // ε CMa (Adhara)
      ],
      [
        [101.287, -16.716], // Sirius
        [95.075, -17.956], // β CMa (Mirzam)
      ],
      [
        [104.034, -17.054], // Adhara
        [109.523, -27.934], // ζ CMa (Furud)
      ],
      [
        [101.287, -16.716], // Sirius
        [105.940, -27.934], // δ CMa (Wezen)
        [109.523, -27.934], // Furud
      ],
    ],
  },
  {
    name: "Perseus",
    segments: [
      [
        [51.081, 49.861], // Mirfak (α)
        [47.042, 40.956], // Algol (β)
      ],
      [
        [51.081, 49.861], // Mirfak
        [56.080, 38.840], // ε Per
      ],
      [
        [51.081, 49.861], // Mirfak
        [38.040, 53.508], // η Per
      ],
    ],
  },
  {
    name: "Auriga",
    segments: [
      // Pentagon around Capella
      [
        [79.172, 45.998], // Capella (α)
        [89.882, 44.947], // Menkalinan (β)
        [89.930, 37.213], // θ Aur
        [82.027, 33.166], // Hassaleh (ι)
        [75.492, 43.823], // Almaaz (ε)
        [79.172, 45.998], // back to Capella
      ],
    ],
  },
  {
    name: "Boötes",
    segments: [
      // Kite
      [
        [213.915, 19.182], // Arcturus (α)
        [218.020, 30.371], // Princeps (δ) approx
      ],
      [
        [213.915, 19.182], // Arcturus
        [208.671, 18.398], // η Boo
      ],
      [
        [208.671, 18.398], // η
        [221.246, 27.074], // ρ Boo approx (top of kite)
        [218.020, 30.371], // δ
        [228.876, 33.315], // β Boo (Nekkar)
        [221.246, 27.074], // back
      ],
    ],
  },
];
