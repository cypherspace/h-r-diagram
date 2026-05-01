import type { Star } from "../types";

// ESA Gaia archive TAP endpoint. Supports CORS for sync queries.
const TAP_URL = "https://gea.esac.esa.int/tap-server/tap/sync";

export interface GaiaRow {
  source_id: string;
  ra: number;
  dec: number;
  parallax_mas: number;
  parallax_over_error: number;
  g_mag: number;
  bp_rp: number | null;
  teff_k: number | null;
}

export class GaiaError extends Error {
  public override readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "GaiaError";
    this.cause = cause;
  }
}

const CONE_COLUMNS = [
  "source_id",
  "ra",
  "dec",
  "parallax",
  "parallax_over_error",
  "phot_g_mean_mag",
  "bp_rp",
  "teff_gspphot",
];

export async function queryConeSearch(
  raDeg: number,
  decDeg: number,
  radiusDeg: number,
  options: { topN?: number; magLimit?: number; signal?: AbortSignal } = {},
): Promise<GaiaRow[]> {
  const top = options.topN ?? 50;
  const magLimit = options.magLimit ?? 18;
  const adql = `
    SELECT TOP ${top}
      ${CONE_COLUMNS.join(", ")}
    FROM gaiadr3.gaia_source
    WHERE 1 = CONTAINS(
      POINT('ICRS', ra, dec),
      CIRCLE('ICRS', ${raDeg}, ${decDeg}, ${radiusDeg})
    )
      AND parallax IS NOT NULL
      AND parallax > 0
      AND parallax_over_error > 5
      AND phot_g_mean_mag IS NOT NULL
      AND phot_g_mean_mag < ${magLimit}
    ORDER BY phot_g_mean_mag ASC
  `;
  return runAdql(adql, options.signal);
}

export async function queryBox(
  raMinDeg: number,
  raMaxDeg: number,
  decMinDeg: number,
  decMaxDeg: number,
  options: { topN?: number; magLimit?: number; signal?: AbortSignal } = {},
): Promise<GaiaRow[]> {
  const top = options.topN ?? 200;
  const magLimit = options.magLimit ?? 18;
  const adql = `
    SELECT TOP ${top}
      ${CONE_COLUMNS.join(", ")}
    FROM gaiadr3.gaia_source
    WHERE ra BETWEEN ${raMinDeg} AND ${raMaxDeg}
      AND dec BETWEEN ${decMinDeg} AND ${decMaxDeg}
      AND parallax IS NOT NULL
      AND parallax > 0
      AND parallax_over_error > 5
      AND phot_g_mean_mag IS NOT NULL
      AND phot_g_mean_mag < ${magLimit}
    ORDER BY phot_g_mean_mag ASC
  `;
  return runAdql(adql, options.signal);
}

interface GaiaTapResponse {
  metadata: Array<{ name: string; datatype?: string }>;
  data: Array<Array<string | number | null>>;
}

async function runAdql(adql: string, signal?: AbortSignal): Promise<GaiaRow[]> {
  const params = new URLSearchParams({
    REQUEST: "doQuery",
    LANG: "ADQL",
    FORMAT: "json",
    QUERY: adql.trim(),
  });
  let res: Response;
  try {
    res = await fetch(TAP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal,
    });
  } catch (e) {
    throw new GaiaError("Network request to Gaia archive failed.", e);
  }
  if (!res.ok) {
    throw new GaiaError(`Gaia archive returned HTTP ${res.status}.`);
  }
  let json: GaiaTapResponse;
  try {
    json = (await res.json()) as GaiaTapResponse;
  } catch (e) {
    throw new GaiaError("Could not parse Gaia archive response.", e);
  }
  return parseRows(json);
}

function parseRows(json: GaiaTapResponse): GaiaRow[] {
  const cols = json.metadata.map((m) => m.name.toLowerCase());
  const idx = (name: string) => cols.indexOf(name);
  const iSource = idx("source_id");
  const iRa = idx("ra");
  const iDec = idx("dec");
  const iPlx = idx("parallax");
  const iPlxErr = idx("parallax_over_error");
  const iG = idx("phot_g_mean_mag");
  const iBpRp = idx("bp_rp");
  const iTeff = idx("teff_gspphot");

  return json.data.map((row) => ({
    source_id: String(row[iSource]),
    ra: Number(row[iRa]),
    dec: Number(row[iDec]),
    parallax_mas: Number(row[iPlx]),
    parallax_over_error: Number(row[iPlxErr]),
    g_mag: Number(row[iG]),
    bp_rp: row[iBpRp] == null ? null : Number(row[iBpRp]),
    teff_k: row[iTeff] == null ? null : Number(row[iTeff]),
  }));
}

// Gaia parallax in mas -> distance in parsecs.
export function distanceFromParallax(parallaxMas: number): number {
  if (parallaxMas <= 0) throw new Error("non-positive parallax");
  return 1000 / parallaxMas;
}

// Gaia G-band magnitude is close to but not identical to Johnson V.
// For the H-R diagram visualisation we treat G as a proxy for V; this
// introduces ~0.3 mag bias for very red or very blue stars but keeps the
// pipeline simple. A future improvement is the colour-dependent
// transformation G -> V using bp_rp.
export function gaiaRowToStar(row: GaiaRow): Star {
  const distancePc = distanceFromParallax(row.parallax_mas);
  return {
    id: `gaia-${row.source_id}`,
    name: `Gaia DR3 ${row.source_id}`,
    ra: row.ra,
    dec: row.dec,
    mV: row.g_mag,
    distancePc,
    teff: row.teff_k ?? teffFromBpRp(row.bp_rp ?? 0.65),
    bv: row.bp_rp ?? undefined,
    notes: row.teff_k == null ? "T_eff estimated from BP-RP" : undefined,
  };
}

// Rough BP-RP -> Teff using Ballesteros for B-V as a fallback when Gaia
// has no astrophysical-parameter solution.
function teffFromBpRp(bpRp: number): number {
  return (
    4600 *
    (1 / (0.92 * bpRp + 1.7) + 1 / (0.92 * bpRp + 0.62))
  );
}

export function nearestRow(
  rows: GaiaRow[],
  raDeg: number,
  decDeg: number,
): GaiaRow | undefined {
  let best: GaiaRow | undefined;
  let bestSep = Infinity;
  for (const r of rows) {
    const sep = angularSeparationDeg(r.ra, r.dec, raDeg, decDeg);
    if (sep < bestSep) {
      bestSep = sep;
      best = r;
    }
  }
  return best;
}

// Small-angle approximation is sufficient for the radii we use (< 1 deg).
function angularSeparationDeg(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number,
): number {
  const dDec = dec2 - dec1;
  const meanDec = ((dec1 + dec2) / 2) * (Math.PI / 180);
  const dRa = (ra2 - ra1) * Math.cos(meanDec);
  return Math.sqrt(dRa * dRa + dDec * dDec);
}
