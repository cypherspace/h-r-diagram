// "Diagram guide" panel — appears once the user has plotted enough
// stars to make the patterns on the H-R diagram visible. Explains the
// three main groups (main sequence, white dwarfs, red giants), the
// physics behind why each group sits where it does, and offers
// optional region overlays on the user's chart.
//
// Content is original prose informed by the Wikipedia article on the
// Hertzsprung–Russell diagram (https://en.wikipedia.org/wiki/Hertzsprung-Russell_diagram),
// licensed under CC BY-SA 4.0. The schematic SVG below is hand-drawn
// in the same style.

import * as d3 from "d3";

export type OverlayMode = "none" | "basic" | "advanced";

export class DiagramGuide {
  private overlay?: HTMLElement;
  private modal?: HTMLElement;
  private keyHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.close();
  };

  constructor(
    private callbacks: {
      onSetOverlay: (mode: OverlayMode) => void;
      getCurrentOverlay: () => OverlayMode;
    },
  ) {}

  open(): void {
    if (this.overlay) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "how-overlay";
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.modal = document.createElement("div");
    this.modal.className = "how-modal";
    this.modal.setAttribute("role", "dialog");
    this.modal.setAttribute("aria-modal", "true");
    this.modal.setAttribute("aria-labelledby", "guide-title");

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "how-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => this.close());

    const title = document.createElement("h2");
    title.id = "guide-title";
    title.textContent = "A guide to the H-R diagram";

    const intro = document.createElement("p");
    intro.textContent =
      "Now that you've plotted a few hundred stars, you can see the " +
      "patterns astronomers have been studying for over a century. The " +
      "stars are not scattered randomly — they cluster into a few " +
      "well-defined groups, and each group tells us something about how " +
      "stars work.";

    this.modal.append(closeBtn, title, intro);

    // Schematic diagram of the three main groups.
    this.modal.appendChild(buildSchematic());

    // Three group explainers.
    for (const g of MAIN_GROUPS) {
      const h3 = document.createElement("h3");
      h3.textContent = g.heading;
      this.modal.appendChild(h3);
      for (const para of g.paragraphs) {
        const p = document.createElement("p");
        p.textContent = para;
        this.modal.appendChild(p);
      }
    }

    // Overlay-toggle buttons.
    const overlayHeading = document.createElement("h3");
    overlayHeading.textContent = "Show these regions on your diagram";
    this.modal.appendChild(overlayHeading);

    const overlayHelp = document.createElement("p");
    overlayHelp.textContent =
      "Switching an overlay on draws shaded regions and labels on top of " +
      "your H-R diagram so you can see exactly which group each of your " +
      "stars falls into.";
    this.modal.appendChild(overlayHelp);

    const buttons = document.createElement("div");
    buttons.className = "guide-overlay-buttons";

    const noneBtn = overlayButton("Hide overlay", "none", this.callbacks);
    const basicBtn = overlayButton("Add basic overlay", "basic", this.callbacks);
    const advancedBtn = overlayButton(
      "Add advanced overlay",
      "advanced",
      this.callbacks,
    );
    buttons.append(noneBtn, basicBtn, advancedBtn);
    this.modal.appendChild(buttons);

    // Wikipedia attribution.
    const attrib = document.createElement("p");
    attrib.className = "guide-attrib";
    const attribIntro = document.createTextNode(
      "Background and group definitions adapted from the Wikipedia article ",
    );
    const link = document.createElement("a");
    link.href =
      "https://en.wikipedia.org/wiki/Hertzsprung%E2%80%93Russell_diagram";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Hertzsprung–Russell diagram";
    const attribOutro = document.createTextNode(
      ", available under the CC BY-SA 4.0 licence.",
    );
    attrib.append(attribIntro, link, attribOutro);
    this.modal.appendChild(attrib);

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
    window.addEventListener("keydown", this.keyHandler);

    closeBtn.focus({ preventScroll: true });
  }

  close(): void {
    this.overlay?.remove();
    this.overlay = undefined;
    this.modal = undefined;
    window.removeEventListener("keydown", this.keyHandler);
  }
}

function overlayButton(
  label: string,
  mode: OverlayMode,
  cb: {
    onSetOverlay: (mode: OverlayMode) => void;
    getCurrentOverlay: () => OverlayMode;
  },
): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.className = "guide-overlay-btn";
  if (cb.getCurrentOverlay() === mode) b.classList.add("active");
  b.addEventListener("click", () => {
    cb.onSetOverlay(mode);
    // Re-paint active state across siblings.
    const all = b.parentElement?.querySelectorAll<HTMLButtonElement>(
      ".guide-overlay-btn",
    );
    all?.forEach((x) => x.classList.toggle("active", x === b));
  });
  return b;
}

interface Group {
  heading: string;
  paragraphs: string[];
}

const MAIN_GROUPS: Group[] = [
  {
    heading: "The main sequence",
    paragraphs: [
      "The diagonal band running from the top-left (hot, bright) to the " +
        "bottom-right (cool, faint) is the main sequence. About 90% of " +
        "stars in the sky live here.",
      "Main-sequence stars are powered by hydrogen fusion in their cores. " +
        "A star's exact position on the band is set almost entirely by " +
        "its mass: more massive stars burn hotter and brighter, less " +
        "massive ones burn cooler and dimmer. The Sun is a typical " +
        "main-sequence star at around 5800 K and 1 solar luminosity.",
      "The narrowness of the band is the headline result of the H-R " +
        "diagram — it tells us that almost all stars fuse hydrogen the " +
        "same way, just on different scales.",
    ],
  },
  {
    heading: "Red giants (upper right)",
    paragraphs: [
      "When a Sun-like star runs out of hydrogen in its core, the core " +
        "contracts and heats up while the outer layers swell out and " +
        "cool. The star ends up cool on the surface (red) but enormous " +
        "(many tens or hundreds of times the Sun's radius), so it's " +
        "very luminous.",
      "Stefan-Boltzmann's law (L = 4π R² σ T⁴) explains the position: " +
        "even with a low T, a huge R makes L huge. Red giants therefore " +
        "sit in the upper-right of the diagram.",
      "Familiar examples: Aldebaran, Arcturus, and the carbon stars.",
    ],
  },
  {
    heading: "White dwarfs (lower left)",
    paragraphs: [
      "After a Sun-like star sheds its outer envelope as a planetary " +
        "nebula, what's left is the bare carbon-oxygen core — a white " +
        "dwarf. It is no longer fusing anything; it shines only because " +
        "it's still hot from its previous life.",
      "White dwarfs are tiny — about the size of the Earth, but with " +
        "the mass of the Sun. So they're hot (10 000 K and up) but " +
        "their tiny radius makes their luminosity feeble — typically " +
        "around 1/1000 of the Sun's. That's why they sit in the lower " +
        "left of the diagram, far below the main sequence.",
      "Sirius B, the companion of Sirius, is the most famous white dwarf.",
    ],
  },
];

// Schematic H-R diagram. Soft, curved version with the main sequence
// drawn as a smooth S-shape (steep at the extremes, gentle through
// F/G/K) and the giant / white-dwarf regions drawn as fuzzy clouds
// using radial gradients — the way they appear on real published H-R
// diagrams.
function buildSchematic(): HTMLElement {
  const fig = document.createElement("figure");
  fig.className = "hwk-fig";

  const W = 360, H = 260;
  const padL = 44, padR = 18, padT = 18, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  // Domain in log10 space.
  const logTHi = Math.log10(40000);
  const logTLo = Math.log10(2400);
  const logLHi = Math.log10(1e6);
  const logLLo = Math.log10(1e-5);
  const x = (T: number) =>
    padL + ((logTHi - Math.log10(T)) / (logTHi - logTLo)) * innerW; // hotter on the left
  const y = (L: number) =>
    padT + ((logLHi - Math.log10(L)) / (logLHi - logLLo)) * innerH;

  // 16 control points sampled from a smooth main-sequence relation,
  // matching the production overlay. Slope d log L / d log T stays in
  // a narrow ~7-8 range so the Catmull-Rom curve through them has no
  // visible wobble. Band half-width: ±0.6 dex.
  const ms: ReadonlyArray<readonly [number, number, number]> = [
    [40000, 1.3e6, 8.0e4],
    [30000, 2.0e5, 1.3e4],
    [20000, 1.5e4, 1.0e3],
    [15000, 4.0e3, 2.5e2],
    [12000, 1.0e3, 63],
    [10000, 250, 16],
    [8500, 63, 4.0],
    [7000, 14, 0.90],
    [6000, 4.0, 0.25],
    [5500, 1.6, 0.10],
    [5000, 0.80, 0.050],
    [4500, 0.40, 0.025],
    [4000, 0.16, 0.010],
    [3500, 0.063, 0.0040],
    [3000, 0.016, 0.0010],
    [2400, 0.0030, 0.00020],
  ];
  // Use d3.area with the same Catmull-Rom centripetal interpolation as
  // the chart overlay, so the schematic and the live diagram show
  // identically-shaped main-sequence bands.
  const msArea = d3
    .area<readonly [number, number, number]>()
    .x((d) => x(d[0]))
    .y0((d) => y(d[2]))
    .y1((d) => y(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.5));
  const msPath = msArea(ms as Array<[number, number, number]>) ?? "";

  // Background colour wash so the schematic reads at a glance.
  const bgGrad = `
    <linearGradient id="schemBg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0a1430"/>
      <stop offset="40%" stop-color="#0d1830"/>
      <stop offset="70%" stop-color="#150f22"/>
      <stop offset="100%" stop-color="#1a0d1a"/>
    </linearGradient>`;

  fig.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schematic H-R diagram">
      <defs>
        ${bgGrad}
        <radialGradient id="schemGiants" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#ff9b4a" stop-opacity="0.6"/>
          <stop offset="60%" stop-color="#ff8b3a" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#ff8b3a" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="schemSupergiants" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#ffd9d9" stop-opacity="0.55"/>
          <stop offset="60%" stop-color="#ff8585" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#ff8585" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="schemWD" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#e8f0ff" stop-opacity="0.55"/>
          <stop offset="60%" stop-color="#bcd0f0" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#bcd0f0" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="msFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#79c8ff" stop-opacity="0.55"/>
          <stop offset="50%" stop-color="#ffd97a" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#ff6b6b" stop-opacity="0.55"/>
        </linearGradient>
      </defs>

      <rect x="${padL}" y="${padT}" width="${innerW}" height="${innerH}" fill="url(#schemBg)" stroke="#2a3654"/>

      <!-- Supergiants: across the top -->
      <ellipse cx="${x(7000)}" cy="${y(8e4)}" rx="${(x(3500) - x(15000)) / 2}" ry="${(y(2e4) - y(3e5)) / 2}" fill="url(#schemSupergiants)"/>
      <text x="${x(6000)}" y="${y(1e5) + 3}" text-anchor="middle" fill="#ffd0d0" font-size="11" font-weight="600" paint-order="stroke" stroke="#0c1326" stroke-width="2.5" stroke-linejoin="round">Supergiants</text>

      <!-- Red giants (covers giants & supergiants in the simple view) -->
      <ellipse cx="${x(3700)}" cy="${y(800)}" rx="${(x(2500) - x(5500)) / 2}" ry="${(y(10) - y(1e5)) / 2}" fill="url(#schemGiants)" transform="rotate(8 ${x(3700)} ${y(800)})"/>
      <text x="${x(3700)}" y="${y(1000)}" text-anchor="middle" fill="#ffb87a" font-size="11" font-weight="600" paint-order="stroke" stroke="#0c1326" stroke-width="2.5" stroke-linejoin="round">Red giants</text>

      <!-- Main sequence band — smooth Catmull-Rom curve -->
      <path d="${msPath}" fill="url(#msFill)" stroke="#ffd97a" stroke-opacity="0.45" stroke-width="0.7"/>
      <text x="${x(7000)}" y="${y(3)}" text-anchor="middle" fill="#ffd97a" font-size="14" font-weight="600" font-style="italic" transform="rotate(28 ${x(7000)} ${y(3)})" paint-order="stroke" stroke="#0c1326" stroke-width="3" stroke-linejoin="round">Main sequence</text>

      <!-- White dwarfs (cooling sequence: hot/bright UL → cool/dim LR) -->
      <ellipse cx="${x(12500)}" cy="${y(0.003)}" rx="${(x(5000) - x(31000)) / 2}" ry="${(y(0.00025) - y(0.04)) / 2}" fill="url(#schemWD)" transform="rotate(22 ${x(12500)} ${y(0.003)})"/>
      <text x="${x(12500)}" y="${y(0.003) + 3}" text-anchor="middle" fill="#e6ecff" font-size="11" font-weight="600" paint-order="stroke" stroke="#0c1326" stroke-width="2.5" stroke-linejoin="round">White dwarfs</text>

      <!-- Sun marker -->
      <circle cx="${x(5800)}" cy="${y(1)}" r="3" fill="#ffd97a"/>
      <text x="${x(5800) + 7}" y="${y(1) + 3}" fill="#ffd97a" font-size="10">Sun</text>

      <!-- Axis labels and ticks -->
      <text x="${padL + innerW / 2}" y="${H - 18}" text-anchor="middle" fill="#9aa6c2" font-size="10">Surface temperature — hotter ←</text>
      <text x="14" y="${padT + innerH / 2}" text-anchor="middle" fill="#9aa6c2" font-size="10" transform="rotate(-90 14 ${padT + innerH / 2})">Brightness vs the Sun (log)</text>
      <text x="${x(30000)}" y="${H - padB + 14}" fill="#9aa6c2" font-size="9" text-anchor="middle">30 000 K</text>
      <text x="${x(10000)}" y="${H - padB + 14}" fill="#9aa6c2" font-size="9" text-anchor="middle">10 000 K</text>
      <text x="${x(5800)}" y="${H - padB + 14}" fill="#9aa6c2" font-size="9" text-anchor="middle">5 800 K</text>
      <text x="${x(3000)}" y="${H - padB + 14}" fill="#9aa6c2" font-size="9" text-anchor="middle">3 000 K</text>
      <text x="${padL - 4}" y="${y(1e4) + 3}" text-anchor="end" fill="#9aa6c2" font-size="9">10⁴</text>
      <text x="${padL - 4}" y="${y(1) + 3}" text-anchor="end" fill="#9aa6c2" font-size="9">1</text>
      <text x="${padL - 4}" y="${y(1e-4) + 3}" text-anchor="end" fill="#9aa6c2" font-size="9">10⁻⁴</text>
    </svg>
    <figcaption>The main sequence runs as a curved band from the hot,
    bright top-left to the cool, faint bottom-right — gentle through
    F/G/K (where the Sun lives) and steeper at the extremes. Red giants
    cluster cool but bright; white dwarfs sit hot but faint.</figcaption>
  `;
  return fig;
}

