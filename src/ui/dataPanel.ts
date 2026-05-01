import type { PlottedStar, Star } from "../types";
import { absoluteMagnitude, luminositySolar } from "../data/derive";

export class DataPanel {
  constructor(private container: HTMLElement) {}

  showEmpty(): void {
    this.container.innerHTML =
      '<p class="hint">Click a plotted point or a catalog entry.</p>';
  }

  show(star: Star | PlottedStar): void {
    const absMag =
      "absMag" in star ? star.absMag : absoluteMagnitude(star.mV, star.distancePc);
    const lum =
      "luminositySolar" in star ? star.luminositySolar : luminositySolar(absMag);

    const rows: Array<[string, string]> = [
      ["Name", star.name],
      ["Spectral type", star.spectralType ?? "—"],
      ["RA, Dec (J2000)", `${star.ra.toFixed(3)}°, ${star.dec.toFixed(3)}°`],
      ["Apparent mag (V)", star.mV.toFixed(2)],
      ["Distance", formatDistance(star.distancePc)],
      ["Absolute mag (V)", absMag.toFixed(2)],
      ["Luminosity", `${formatLum(lum)} L⊙`],
      ["T_eff", `${star.teff.toFixed(0)} K`],
      ["B − V", star.bv != null ? star.bv.toFixed(2) : "—"],
    ];
    if (star.notes) rows.push(["Notes", star.notes]);

    const thumb = thumbnailUrl(star.ra, star.dec);

    this.container.innerHTML =
      `<img class="thumb" alt="DSS2 cutout of ${escape(star.name)}" src="${escape(thumb)}" loading="lazy" />` +
      "<dl>" +
      rows
        .map(
          ([k, v]) =>
            `<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`,
        )
        .join("") +
      "</dl>";
  }
}

// hips2fits cutout service from CDS Strasbourg. Returns a JPG of the
// requested HiPS at the given RA/Dec/FoV.
function thumbnailUrl(ra: number, dec: number): string {
  const params = new URLSearchParams({
    hips: "CDS/P/DSS2/color",
    ra: ra.toFixed(6),
    dec: dec.toFixed(6),
    fov: "0.1",
    width: "180",
    height: "180",
    projection: "TAN",
    format: "jpg",
  });
  return `https://alasky.cds.unistra.fr/hips-image-services/hips2fits?${params.toString()}`;
}

function formatDistance(pc: number): string {
  if (pc < 1e-3) return `${(pc * 206265).toFixed(2)} AU`;
  if (pc < 1) return `${(pc * 3.262).toFixed(3)} ly`;
  if (pc < 1000) return `${pc.toFixed(2)} pc`;
  return `${(pc / 1000).toFixed(2)} kpc`;
}

function formatLum(l: number): string {
  if (l >= 1e4 || l < 1e-2) return l.toExponential(2);
  return l.toFixed(l < 1 ? 4 : 2);
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
}
