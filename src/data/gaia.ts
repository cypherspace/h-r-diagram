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
  // Set true for errors worth retrying automatically (e.g. 503
  // "service too busy"). Inspected by runAdql.
  public transient = false;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "GaiaError";
    this.cause = cause;
  }
}

// VizieR Gaia DR3 main catalog: I/355/gaiadr3.
// We compute BP-RP from BPmag and RPmag (avoids the hyphenated column
// name) and parallax_over_error from Plx / e_Plx. We DON'T attempt a
// JOIN with paramsup in the same query — VizieR's ADQL parser rejects
// joins involving CONTAINS() with "1 unresolved identifier!" errors
// because both tables share columns named Source, RA_ICRS, DE_ICRS,
// and qualified references like g."RA_ICRS" inside POINT() trip the
// parser even though they should be unambiguous. Instead we run a
// second, focused query against paramsup using the source IDs from
// the cone search; see fetchParamsup() below.
function buildConeAdql(
  raDeg: number,
  decDeg: number,
  radiusDeg: number,
  topN: number,
  magLimit: number,
): string {
  return `SELECT TOP ${topN}
  "Source", "RA_ICRS", "DE_ICRS", "Plx", "e_Plx", "Gmag",
  ("BPmag" - "RPmag") AS bprp
FROM "I/355/gaiadr3"
WHERE 1 = CONTAINS(
    POINT('ICRS', "RA_ICRS", "DE_ICRS"),
    CIRCLE('ICRS', ${raDeg}, ${decDeg}, ${radiusDeg})
  )
  AND "Plx" IS NOT NULL
  AND "Plx" > 0
  AND "e_Plx" IS NOT NULL
  AND "e_Plx" > 0
  AND ("Plx" / "e_Plx") > 5
  AND "Gmag" IS NOT NULL
  AND "Gmag" < ${magLimit}
ORDER BY "Gmag" ASC`;
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
  "Source", "RA_ICRS", "DE_ICRS", "Plx", "e_Plx", "Gmag",
  ("BPmag" - "RPmag") AS bprp
FROM "I/355/gaiadr3"
WHERE "RA_ICRS" BETWEEN ${raMin} AND ${raMax}
  AND "DE_ICRS" BETWEEN ${decMin} AND ${decMax}
  AND "Plx" IS NOT NULL
  AND "Plx" > 0
  AND "e_Plx" IS NOT NULL
  AND "e_Plx" > 0
  AND ("Plx" / "e_Plx") > 5
  AND "Gmag" IS NOT NULL
  AND "Gmag" < ${magLimit}
ORDER BY "Gmag" ASC`;
}

function buildParamsupAdql(sourceIds: string[]): string {
  // ADQL doesn't reliably support large IN clauses, but a few hundred
  // IDs is fine. The Source column is BIGINT in paramsup, so emit them
  // as raw integers (no quotes).
  const list = sourceIds.join(",");
  return `SELECT "Source", "Teff", "Lum-Flame" AS lum_flame
FROM "I/355/paramsup"
WHERE "Source" IN (${list})`;
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
  const rows = await runAdql(adql, options.signal);
  await enrichWithParamsup(rows, options.signal);
  return rows;
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
  const rows = await runAdql(adql, options.signal);
  await enrichWithParamsup(rows, options.signal);
  return rows;
}

// Mutates `rows` to fill in teff_k and lum_flame_solar from paramsup
// where Gaia has published those values. Failures here are non-fatal:
// the cone search's data is still useful even without published Teff /
// luminosity (the caller falls back to BP-RP-derived values).
async function enrichWithParamsup(
  rows: GaiaRow[],
  signal?: AbortSignal,
): Promise<void> {
  if (rows.length === 0) return;
  const ids = rows.map((r) => r.source_id).filter(Boolean);
  if (ids.length === 0) return;
  try {
    const adql = buildParamsupAdql(ids);
    const params = await runParamsup(adql, signal);
    if (params.size === 0) return;
    for (const r of rows) {
      const p = params.get(r.source_id);
      if (!p) continue;
      if (p.teff != null) r.teff_k = p.teff;
      if (p.lum != null) r.lum_flame_solar = p.lum;
    }
  } catch (e) {
    // Don't fail the whole search if paramsup is busy — log and move on.
    if (signal?.aborted) throw e;
    console.warn("[gaia] paramsup enrichment failed:", e);
  }
}

async function runAdql(adql: string, signal?: AbortSignal): Promise<GaiaRow[]> {
  // VizieR's TAP service is shared infrastructure and occasionally
  // glitches — 503 "service too busy", 400 "1 unresolved identifier"
  // (a server-side parser hiccup, not a real syntax error), etc. Retry
  // up to 3 times with backoff; on final failure, surface a friendly
  // message rather than the raw VOTable error XML.
  const MAX_ATTEMPTS = 3;
  let lastErr: GaiaError | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await runAdqlOnce(adql, signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      if (e instanceof GaiaError && e.transient && attempt < MAX_ATTEMPTS) {
        lastErr = e;
        // Exponential backoff: 1.0 s, 2.5 s.
        await sleep(1000 + 1500 * (attempt - 1), signal);
        continue;
      }
      throw e;
    }
  }
  throw (
    lastErr ??
    new GaiaError(
      "VizieR isn't responding cleanly right now. Please try again in a moment.",
    )
  );
}

async function runAdqlOnce(
  adql: string,
  signal?: AbortSignal,
): Promise<GaiaRow[]> {
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
    // 503 = "TAP service too busy" — transient, worth a retry.
    if (res.status === 503 || /service too busy/i.test(text)) {
      const err = new GaiaError(
        "VizieR is busy right now. Please try again in a moment.",
      );
      err.transient = true;
      throw err;
    }
    // VizieR occasionally returns 400 "1 unresolved identifiers!" or
    // similar parser glitches under load — these are transient
    // server-side problems with their ADQL parser, not real syntax
    // errors in our query (which is fixed and well-formed). A second
    // attempt almost always succeeds.
    if (
      res.status === 400 &&
      /unresolved identifier|NullPointerException|Unable to check/i.test(text)
    ) {
      const err = new GaiaError(
        "VizieR couldn't validate the query. Retrying…",
      );
      err.transient = true;
      throw err;
    }
    // Pull out the most informative bit of the VOTable XML (the
    // QUERY_STATUS message) so the surfaced error is actionable rather
    // than a wall of envelope.
    const m = text.match(
      /QUERY_STATUS"\s+value="ERROR">\s*([\s\S]*?)\s*<\/INFO>/,
    );
    const detail = m?.[1] ?? text.slice(0, 400);
    throw new GaiaError(`VizieR returned HTTP ${res.status}. ${detail}`);
  }
  return parseCsv(text);
}

// Parse the much simpler CSV that paramsup returns ("Source", "Teff",
// "lum_flame"). Returns a Map keyed by source_id string.
async function runParamsup(
  adql: string,
  signal?: AbortSignal,
): Promise<Map<string, { teff: number | null; lum: number | null }>> {
  const params = new URLSearchParams({
    REQUEST: "doQuery",
    LANG: "ADQL",
    FORMAT: "csv",
    QUERY: adql,
  });
  const res = await fetch(TAP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    signal,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new GaiaError(
      `VizieR (paramsup) returned HTTP ${res.status}. ${text.slice(0, 200)}`,
    );
  }
  return parseParamsupCsv(text);
}

export function parseParamsupCsv(
  text: string,
): Map<string, { teff: number | null; lum: number | null }> {
  const out = new Map<string, { teff: number | null; lum: number | null }>();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return out;
  const headers = lines[0].split(",").map((h) => h.trim());
  const idx = (...candidates: string[]) => {
    for (const c of candidates) {
      const i = headers.findIndex((h) => h.toLowerCase() === c.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const iSource = idx("Source", "source");
  const iTeff = idx("Teff", "teff");
  const iLum = idx("lum_flame", "Lum-Flame");
  if (iSource < 0) return out;
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    if (cells.length < headers.length) continue;
    const id = cells[iSource];
    if (!id) continue;
    const teff = iTeff >= 0 ? num(cells[iTeff]) : null;
    const lum = iLum >= 0 ? num(cells[iLum]) : null;
    out.set(id, { teff, lum });
  }
  return out;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

// Exposed for tests — exercises the same parser path used in
// production but lets tests pass synthetic CSV without a network call.
export function _parseCsvForTests(text: string): GaiaRow[] {
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
  // The cone/box query returns gaiadr3 columns un-aliased; CSV headers
  // are Source / RA_ICRS / DE_ICRS / Plx / e_Plx / Gmag / bprp. The
  // teff/lum-flame fields are filled in later by the paramsup query
  // (enrichWithParamsup) — they don't appear in this CSV. Keep alias
  // names as fallbacks in case we ever go back to a JOIN.
  const iSource = idx("Source", "source", "source_id");
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
