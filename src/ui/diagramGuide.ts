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

// Schematic H-R diagram. Hand-drawn SVG showing T (x, hot to cool, log)
// vs L (y, log) with shaded regions for main sequence, red giants, and
// white dwarfs.
function buildSchematic(): HTMLElement {
  const fig = document.createElement("figure");
  fig.className = "hwk-fig";
  fig.innerHTML = `
    <svg viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schematic H-R diagram">
      <defs>
        <linearGradient id="msGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#79c8ff" stop-opacity="0.55"/>
          <stop offset="50%" stop-color="#ffd97a" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#ff6b6b" stop-opacity="0.55"/>
        </linearGradient>
      </defs>
      <!-- background -->
      <rect x="40" y="14" width="305" height="190" fill="#0c1326" stroke="#2a3654"/>
      <!-- axes labels -->
      <text x="190" y="226" text-anchor="middle" fill="#9aa6c2" font-size="10">Surface temperature — hotter ←</text>
      <text x="14" y="110" text-anchor="middle" fill="#9aa6c2" font-size="10" transform="rotate(-90 14 110)">Brightness vs the Sun (log) →</text>
      <!-- temperature ticks -->
      <text x="60" y="218" fill="#9aa6c2" font-size="9" text-anchor="middle">30 000 K</text>
      <text x="200" y="218" fill="#9aa6c2" font-size="9" text-anchor="middle">5 800 K (Sun)</text>
      <text x="320" y="218" fill="#9aa6c2" font-size="9" text-anchor="middle">3 000 K</text>
      <!-- main sequence band -->
      <polygon points="55,30 95,28 320,180 305,200 270,200 75,55" fill="url(#msGrad)" stroke="#ffd97a" stroke-width="0.7" opacity="0.85"/>
      <text x="170" y="115" fill="#ffd97a" font-size="11" font-style="italic" transform="rotate(-32 170 115)">Main sequence</text>
      <!-- red giants -->
      <ellipse cx="280" cy="55" rx="55" ry="22" fill="#ff8b3a" opacity="0.45" stroke="#ff8b3a" stroke-width="0.7"/>
      <text x="280" y="58" text-anchor="middle" fill="#ffb87a" font-size="11" font-weight="600">Red giants</text>
      <!-- white dwarfs -->
      <ellipse cx="120" cy="180" rx="55" ry="14" fill="#d6e5ff" opacity="0.35" stroke="#d6e5ff" stroke-width="0.7"/>
      <text x="120" y="184" text-anchor="middle" fill="#e6ecff" font-size="11" font-weight="600">White dwarfs</text>
      <!-- Sun marker -->
      <circle cx="200" cy="125" r="3" fill="#ffd97a"/>
      <text x="207" y="129" fill="#ffd97a" font-size="9">Sun</text>
    </svg>
    <figcaption>Schematic H-R diagram: the diagonal main sequence,
    cool-and-bright red giants (upper right), and hot-but-faint white
    dwarfs (lower left).</figcaption>
  `;
  return fig;
}
