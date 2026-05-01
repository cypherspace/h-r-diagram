import type { PlottedStar, Star } from "../types";
import {
  absoluteMagnitude,
  deriveSpectralType,
  kelvinToCelsius,
  luminositySolar,
} from "../data/derive";

export class DataPanel {
  constructor(private container: HTMLElement) {}

  showEmpty(): void {
    this.container.replaceChildren();
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "Click a sample star or a plotted point.";
    this.container.appendChild(p);
  }

  show(star: Star | PlottedStar): void {
    const absMag =
      "absMag" in star ? star.absMag : absoluteMagnitude(star.mV, star.distancePc);
    const lum =
      "luminositySolar" in star ? star.luminositySolar : luminositySolar(absMag);

    let spectralType = star.spectralType;
    if (!spectralType) {
      spectralType = `${deriveSpectralType(star.teff, absMag)} (estimated)`;
    }

    this.container.replaceChildren();

    // Thumbnail.
    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = `Sky cutout of ${star.name}`;
    img.src = thumbnailUrl(star.ra, star.dec);
    img.loading = "lazy";
    this.container.appendChild(img);

    // Star name.
    const h3 = document.createElement("h3");
    h3.className = "star-name";
    h3.textContent = star.name;
    this.container.appendChild(h3);

    // Headlines: temperature, brightness, distance.
    this.container.appendChild(
      headlineStat(
        "Temperature",
        `${formatTemperatureK(star.teff)}  /  ${formatTemperatureC(star.teff)}`,
      ),
    );
    this.container.appendChild(
      headlineStat(
        "Brightness vs. the Sun",
        `${formatLumAsTimes(lum)}`,
      ),
    );
    this.container.appendChild(
      headlineStat("Distance", formatDistance(star.distancePc)),
    );

    // Secondary stats.
    const secondary = document.createElement("dl");
    secondary.className = "secondary-stats";
    secondary.append(
      ...secondaryRow(
        "How bright it looks (apparent magnitude)",
        star.mV.toFixed(2),
      ),
      ...secondaryRow(
        "Brightness at a standard distance (absolute magnitude)",
        absMag.toFixed(2),
      ),
      ...spectralRow(spectralType),
    );
    this.container.appendChild(secondary);

    // External-info links: Wikipedia for named stars (when we have a
    // page slug), plus ESA Sky as a visual "explore this region of the
    // sky" tool for any star. ESA Sky is run by the European Space Agency
    // and shows multi-wavelength imagery + the Gaia DR3 catalogue, so
    // students can hover any marker to see the same star they're looking
    // at here. Useful in particular for Gaia-discovered stars where a
    // Wikipedia page doesn't exist.
    const links = document.createElement("div");
    links.className = "external-links";
    if (star.wikipedia) {
      links.appendChild(
        externalLink(
          `https://en.wikipedia.org/wiki/${star.wikipedia}`,
          "Read about this star on Wikipedia →",
        ),
      );
    }
    links.appendChild(
      externalLink(esaSkyUrl(star.ra, star.dec), "Explore this star on ESA Sky →"),
    );
    this.container.appendChild(links);

    // Hidden details.
    const details = document.createElement("details");
    details.className = "extra-details";
    const summary = document.createElement("summary");
    summary.textContent = "Additional star info";
    details.appendChild(summary);

    const dl = document.createElement("dl");
    dl.className = "secondary-stats";
    dl.append(
      ...secondaryRow(
        "Position in the sky (RA, Dec)",
        `${star.ra.toFixed(3)}°, ${star.dec.toFixed(3)}°`,
      ),
      ...secondaryRow(
        "Colour index (B − V)",
        star.bv != null ? star.bv.toFixed(2) : "—",
      ),
    );
    if (star.notes) {
      dl.append(...secondaryRow("Notes", star.notes));
    }
    details.appendChild(dl);
    this.container.appendChild(details);
  }
}

function externalLink(href: string, text: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = "external-link";
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = text;
  return a;
}

function esaSkyUrl(ra: number, dec: number): string {
  const params = new URLSearchParams({
    target: `${ra.toFixed(5)} ${dec.toFixed(5)}`,
    hips: "DSS2 color",
    fov: "0.1",
    cooframe: "J2000",
    sci: "true",
    lang: "en",
  });
  return `https://sky.esa.int/esasky/?${params.toString()}`;
}

function headlineStat(label: string, value: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "headline-stat";
  const lab = document.createElement("div");
  lab.className = "headline-label";
  lab.textContent = label;
  const val = document.createElement("div");
  val.className = "headline-value";
  val.textContent = value;
  wrap.append(lab, val);
  return wrap;
}

function secondaryRow(label: string, value: string): [HTMLElement, HTMLElement] {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  return [dt, dd];
}

// Spectral class plus a "?" help disclosure that explains the letter +
// digit + roman-numeral notation in plain English. Click the "?" to
// expand a small explainer in-line; a Wikipedia link is included for
// students who want to read further.
function spectralRow(value: string): HTMLElement[] {
  const dt = document.createElement("dt");
  dt.className = "spectral-dt";
  dt.append("Spectral class");
  const help = document.createElement("button");
  help.type = "button";
  help.className = "spectral-help-btn";
  help.textContent = "?";
  help.title = "What does this mean?";
  dt.append(" ", help);

  const dd = document.createElement("dd");
  dd.textContent = value;

  const helpBox = document.createElement("dd");
  helpBox.className = "spectral-help-box";
  helpBox.hidden = true;
  helpBox.append(buildSpectralHelp());

  help.addEventListener("click", () => {
    helpBox.hidden = !helpBox.hidden;
    help.classList.toggle("open", !helpBox.hidden);
  });

  return [dt, dd, helpBox];
}

function buildSpectralHelp(): DocumentFragment {
  const frag = document.createDocumentFragment();

  const intro = document.createElement("p");
  intro.textContent =
    "Stars are sorted by surface temperature into 7 main classes, hottest to coolest:";
  frag.appendChild(intro);

  const list = document.createElement("ul");
  for (const [letter, desc] of [
    ["O", "very hot blue stars"],
    ["B", "hot blue-white stars"],
    ["A", "white stars (Sirius, Vega)"],
    ["F", "yellow-white stars"],
    ["G", "yellow stars (the Sun)"],
    ["K", "orange stars"],
    ["M", "cool red stars (most stars in the galaxy)"],
  ] as const) {
    const li = document.createElement("li");
    const b = document.createElement("strong");
    b.textContent = letter;
    li.append(b, " — ", desc);
    list.appendChild(li);
  }
  frag.appendChild(list);

  const detail = document.createElement("p");
  detail.innerHTML =
    "A digit 0–9 narrows the temperature within the class, and a Roman numeral hints at the star's size: " +
    "<strong>V</strong> main sequence (most stars live here), " +
    "<strong>III</strong> giant, <strong>I</strong> supergiant, " +
    "<strong>D</strong> white dwarf.";
  frag.appendChild(detail);

  const link = document.createElement("a");
  link.href = "https://en.wikipedia.org/wiki/Stellar_classification";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Read more on Wikipedia →";
  link.className = "spectral-help-link";
  frag.appendChild(link);

  return frag;
}

function formatTemperatureK(k: number): string {
  return `${formatNumber(Math.round(k))} K`;
}

function formatTemperatureC(k: number): string {
  const c = kelvinToCelsius(k);
  return `${formatNumber(Math.round(c))} °C`;
}

function formatNumber(n: number): string {
  // Insert thin spaces every three digits for readability.
  return n.toLocaleString("en-GB").replace(/,/g, " ");
}

function formatLumAsTimes(l: number): string {
  if (!Number.isFinite(l) || l <= 0) return "—";
  if (l >= 100) return `${formatNumber(Math.round(l))} × the Sun`;
  if (l >= 1) return `${l.toFixed(1)} × the Sun`;
  if (l >= 0.01) return `${l.toFixed(3)} × the Sun`;
  return `${l.toExponential(2)} × the Sun`;
}

function formatDistance(pc: number): string {
  // Educational units: prefer light-years for non-trivial distances.
  if (pc < 1e-3) {
    const au = pc * 206265;
    return `${formatNumber(Math.round(au))} AU`;
  }
  const ly = pc * 3.2616;
  if (pc < 1) return `${ly.toFixed(2)} light-years`;
  if (pc < 1000)
    return `${ly.toFixed(1)} light-years (${pc.toFixed(1)} pc)`;
  return `${formatNumber(Math.round(ly))} light-years (${(pc / 1000).toFixed(2)} kpc)`;
}

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
