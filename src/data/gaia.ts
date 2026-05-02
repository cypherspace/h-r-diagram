import type { Star } from "../types";
import { absoluteMagnitude, deriveSpectralType } from "./derive";

// VizieR TAP (CDS Strasbourg). Known to be CORS-enabled for browser apps,
// unlike the ESA Gaia archive which is unreliable from the browser.
const TAP_URL = "https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync";

export interface GaiaRow {
  source_id: string;
  ra: number;
  dec: number;
  parallax_mas: number;
  parallax_over_error: number;
  g_mag: number;
  bp_rp: number | null;
  // Published Gaia DR3 GSP-Phot effective temperature (paramsup.Teff),
  // null if not available.
  teff_k: number | null;
  // Published FLAME bolometric luminosity in solar units
  // (paramsup."Lum-Flame"), null if not available.
  lum_flame_solar: number | null;
}

export class GaiaError extends Error {
  public override readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "GaiaError";
    this.cause = cause;
  }
}

// VizieR Gaia DR3 main catalog: I/355/gaiadr3.
// We compute BP-RP from BPmag and RPmag (avoids the hyphenated column name)
// and parallax_over_error from Plx / e_Plx. Joined with the astrophysical-
// parameters supplement (I/355/paramsup) to pick up published Teff and
// FLAME luminosity — when present we use those directly rather than
// deriving from BP-RP.
function buildConeAdql(
  raDeg: number,
  decDeg: number,
  radiusDeg: number,
  topN: number,
  magLimit: number,
): string {
  return `SELECT TOP ${topN}
  g."Source", g."RA_ICRS", g."DE_ICRS", g."Plx", g."e_Plx", g."Gmag",
  (g."BPmag" - g."RPmag") AS bprp,
  p."Teff" AS teff_pub,
  p."Lum-Flame" AS lum_flame
FROM "I/355/gaiadr3" g
LEFT OUTER JOIN "I/355/paramsup" p ON g."Source" = p."Source"
WHERE 1 = CONTAINS(
    POINT('ICRS', g."RA_ICRS", g."DE_ICRS"),
    CIRCLE('ICRS', ${raDeg}, ${decDeg}, ${radiusDeg})
  )
  AND g."Plx" IS NOT NULL
  AND g."Plx" > 0
  AND g."e_Plx" IS NOT NULL
  AND g."e_Plx" > 0
  AND (g."Plx" / g."e_Plx") > 5
  AND g."Gmag" IS NOT NULL
  AND g."Gmag" < ${magLimit}
ORDER BY g."Gmag" ASC`;
}

function buildBoxAdql(
  raMin: number,
  raMax: number,
  decMin: number,
  decMax: number,
  topN: number,
  magLimit: number,
): string {
  return `SELECT TOP ${topN}
  g."Source", g."RA_ICRS", g."DE_ICRS", g."Plx", g."e_Plx", g."Gmag",
  (g."BPmag" - g."RPmag") AS bprp,
  p."Teff" AS teff_pub,
  p."Lum-Flame" AS lum_flame
FROM "I/355/gaiadr3" g
LEFT OUTER JOIN "I/355/paramsup" p ON g."Source" = p."Source"
WHERE g."RA_ICRS" BETWEEN ${raMin} AND ${raMax}
  AND g."DE_ICRS" BETWEEN ${decMin} AND ${decMax}
  AND g."Plx" IS NOT NULL
  AND g."Plx" > 0
  AND g."e_Plx" IS NOT NULL
  AND g."e_Plx" > 0
  AND (g."Plx" / g."e_Plx") > 5
  AND g."Gmag" IS NOT NULL
  AND g."Gmag" < ${magLimit}
ORDER BY g."Gmag" ASC`;
}

export async function queryConeSearch(
  raDeg: number,
  decDeg: number,
  radiusDeg: number,
  options: { topN?: number; magLimit?: number; signal?: AbortSignal } = {},
): Promise<GaiaRow[]> {
  const adql = buildConeAdql(
    raDeg,
    decDeg,
    radiusDeg,
    options.topN ?? 50,
    options.magLimit ?? 18,
  );
  return runAdql(adql, options.signal);
}

export async function queryBox(
  raMin: number,
  raMax: number,
  decMin: number,
  decMax: number,
  options: { topN?: number; magLimit?: number; signal?: AbortSignal } = {},
): Promise<GaiaRow[]> {
  const adql = buildBoxAdql(
    raMin,
    raMax,
    decMin,
    decMax,
    options.topN ?? 200,
    options.magLimit ?? 18,
  );
  return runAdql(adql, options.signal);
}

async function runAdql(adql: string, signal?: AbortSignal): Promise<GaiaRow[]> {
  const params = new URLSearchParams({
    REQUEST: "doQuery",
    LANG: "ADQL",
    FORMAT: "csv",
    QUERY: adql,
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
    console.error("[gaia] network error", e);
    throw new GaiaError(
      "Network error reaching VizieR. If this page is opened from " +
        "file://, the browser blocks cross-origin fetches. Serve over " +
        "http(s) (e.g. `npx serve dist`) or embed it in a website.",
      e,
    );
  }
  const text = await res.text();
  if (!res.ok) {
    console.error("[gaia] HTTP", res.status, text.slice(0, 500));
    throw new GaiaError(
      `VizieR returned HTTP ${res.status}. ${text.slice(0, 200)}`,
    );
  }
  return parseCsv(text);
}

// VizieR returns CSV with a header row followed by data rows.
// Columns we expect (in declared SELECT order):
// Source, RA_ICRS, DE_ICRS, Plx, e_Plx, Gmag, bprp, teff_pub, lum_flame
function parseCsv(text: string): GaiaRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const idx = (...candidates: string[]) => {
    for (const c of candidates) {
      const i = headers.findIndex((h) => h.toLowerCase() === c.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const iSource = idx("Source", "source");
  const iRa = idx("RA_ICRS", "ra_icrs", "ra", "RAJ2000");
  const iDec = idx("DE_ICRS", "de_icrs", "dec", "DEJ2000");
  const iPlx = idx("Plx", "plx", "parallax");
  const iEPlx = idx("e_Plx", "e_plx");
  const iG = idx("Gmag", "gmag", "phot_g_mean_mag");
  const iBpRp = idx("bprp", "BP-RP", "bp_rp");
  const iTeffPub = idx("teff_pub", "Teff", "teff");
  const iLumFlame = idx("lum_flame", "Lum-Flame", "lumflame");

  const rows: GaiaRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    if (cells.length < headers.length) continue;
    const plx = num(cells[iPlx]);
    const ePlx = num(cells[iEPlx]);
    const g = num(cells[iG]);
    const bpRp = iBpRp >= 0 ? num(cells[iBpRp]) : null;
    const teffPub = iTeffPub >= 0 ? num(cells[iTeffPub]) : null;
    const lumFlame = iLumFlame >= 0 ? num(cells[iLumFlame]) : null;
    if (plx === null || ePlx === null || g === null) continue;
    if (plx <= 0 || ePlx <= 0) continue;
    rows.push({
      source_id: cells[iSource],
      ra: num(cells[iRa]) ?? 0,
      dec: num(cells[iDec]) ?? 0,
      parallax_mas: plx,
      parallax_over_error: plx / ePlx,
      g_mag: g,
      bp_rp: bpRp,
      teff_k: teffPub,
      lum_flame_solar: lumFlame,
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  // Simple CSV parser: handles quoted strings with commas. Sufficient for
  // VizieR TAP output which doesn't use embedded newlines or escaped quotes.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function num(s: string | undefined): number | null {
  if (s == null || s === "" || s.toLowerCase() === "nan" || s === "null") {
    return null;
  }
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

// ---- conversions ----

export function distanceFromParallax(parallaxMas: number): number {
  if (parallaxMas <= 0) throw new Error("non-positive parallax");
  return 1000 / parallaxMas;
}

// Approximate Gaia BP-RP -> Teff. Calibrated against the Sun (BP-RP ~ 0.82,
// Teff ~ 5778), Sirius A (BP-RP ~ 0, Teff ~ 9940), and M dwarfs (BP-RP ~ 2.5,
// Teff ~ 3300). Sufficient for the educational visualisation; the caller
// should mark these stars with notes="Teff estimated from BP-RP".
export function teffFromBpRp(bpRp: number): number {
  // Pecaut & Mamajek-style fit, simplified: T = 4600 * f(B-V) with
  // B-V ~= 0.83 * (BP-RP) - 0.05.
  const bv = 0.83 * bpRp - 0.05;
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

export function gaiaRowToStar(row: GaiaRow): Star {
  const distancePc = distanceFromParallax(row.parallax_mas);
  let teff: number | undefined;
  let teffSource: "published" | "derived" | undefined;
  let notes: string | undefined;
  if (row.teff_k != null && Number.isFinite(row.teff_k)) {
    teff = row.teff_k;
    teffSource = "published";
  } else if (row.bp_rp != null && Number.isFinite(row.bp_rp)) {
    teff = teffFromBpRp(row.bp_rp);
    teffSource = "derived";
    notes = "Temperature estimated from the star's colour.";
  } else {
    notes = "Temperature unknown — not enough information from Gaia.";
  }

  const absMag = absoluteMagnitude(row.g_mag, distancePc);
  const luminosity =
    row.lum_flame_solar != null && Number.isFinite(row.lum_flame_solar)
      ? row.lum_flame_solar
      : undefined;
  const luminositySource: "published" | "derived" | undefined =
    luminosity != null ? "published" : teff != null ? "derived" : undefined;
  const spectralType =
    teff != null
      ? `${deriveSpectralType(teff, absMag)} (estimated)`
      : undefined;

  return {
    id: `gaia-${row.source_id}`,
    name: `Star ${row.source_id}`,
    ra: row.ra,
    dec: row.dec,
    mV: row.g_mag,
    distancePc,
    teff,
    bv: row.bp_rp ?? undefined,
    spectralType,
    notes,
    luminosity,
    teffSource,
    luminositySource,
  };
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
