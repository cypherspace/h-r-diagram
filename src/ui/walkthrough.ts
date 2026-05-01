interface Step {
  target: string;
  title: string;
  body: string;
}

const STORAGE_KEY = "hrd:tour-seen:v2";

const STEPS: Step[] = [
  {
    target: "#sky-panel",
    title: "Welcome",
    body:
      "This tool plots real stars on a Hertzsprung–Russell diagram. " +
      "On the left is a window onto the night sky (Aladin Lite); on " +
      "the right is the H-R diagram you'll build up.",
  },
  {
    target: "#goto-input",
    title: "Pick a region",
    body:
      'Type the name of a star or cluster (try "M45" for the Pleiades, ' +
      'or "Sirius") and press Go. You can also pan with drag and zoom with scroll.',
  },
  {
    target: "#search-btn",
    title: "Search",
    body:
      "Once you've framed a region, press Search. The app queries Gaia DR3 " +
      "for stars in the visible region and shows them as blue ＋ markers. " +
      "Nothing is added to the diagram yet.",
  },
  {
    target: "#add-all-btn",
    title: "Add objects",
    body:
      'Click any blue ＋ marker to add that single star, or hit "Add all" ' +
      "to add every search result at once. The yellow circles are pre-loaded " +
      "reference stars (Sun, Sirius, Vega, …) — clicking one adds it too.",
  },
  {
    target: "#diagram",
    title: "The H-R diagram",
    body:
      "Each star is drawn in its black-body colour at the right luminosity " +
      "and temperature. Click a point to highlight the star and recenter the " +
      "sky on it. The controls below the plot switch axes and save diagrams.",
  },
  {
    target: "#info-panel",
    title: "Inspect & save",
    body:
      "The selected star's full data and a sky cutout appear here. Use the " +
      'controls below the diagram to switch axes, clear points, or save the ' +
      "current diagram to local storage.",
  },
];

export class Walkthrough {
  private backdrop?: HTMLElement;
  private tooltip?: HTMLElement;
  private idx = 0;
  private resizeHandler = () => this.position();
  private keyHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.end();
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.advance();
    }
  };

  static hasBeenSeen(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  static markSeen(): void {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  static reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  start(): void {
    if (this.tooltip) return;
    this.idx = 0;

    this.backdrop = document.createElement("div");
    this.backdrop.className = "tour-backdrop";

    this.tooltip = document.createElement("div");
    this.tooltip.className = "tour-tooltip";

    // Append separately so the tooltip's stacking context is independent
    // of the backdrop. The previous version made the tooltip a child of
    // the backdrop overlay, which (combined with z-index on the
    // highlighted target) could leave the buttons obscured or unclickable.
    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.tooltip);

    window.addEventListener("resize", this.resizeHandler);
    window.addEventListener("keydown", this.keyHandler);
    this.render();
  }

  private end(): void {
    Walkthrough.markSeen();
    this.backdrop?.remove();
    this.tooltip?.remove();
    this.backdrop = undefined;
    this.tooltip = undefined;
    document
      .querySelectorAll(".tour-highlighted")
      .forEach((el) => el.classList.remove("tour-highlighted"));
    window.removeEventListener("resize", this.resizeHandler);
    window.removeEventListener("keydown", this.keyHandler);
  }

  private advance(): void {
    if (this.idx >= STEPS.length - 1) {
      this.end();
    } else {
      this.idx++;
      this.render();
    }
  }

  private render(): void {
    if (!this.tooltip) return;
    const step = STEPS[this.idx];
    const isLast = this.idx === STEPS.length - 1;

    this.tooltip.replaceChildren();

    const h3 = document.createElement("h3");
    h3.textContent = step.title;

    const p = document.createElement("p");
    p.textContent = step.body;

    const actions = document.createElement("div");
    actions.className = "tour-actions";

    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "tour-skip";
    skip.textContent = "Skip tour";
    skip.addEventListener("click", () => this.end());

    const progress = document.createElement("span");
    progress.className = "tour-progress";
    progress.textContent = `${this.idx + 1} / ${STEPS.length}`;

    const next = document.createElement("button");
    next.type = "button";
    next.className = "tour-next";
    next.textContent = isLast ? "Done" : "Next →";
    next.addEventListener("click", () => this.advance());

    actions.append(skip, progress, next);
    this.tooltip.append(h3, p, actions);

    // Re-position after the new content has been laid out so width/height
    // are accurate.
    requestAnimationFrame(() => this.position());

    // Focus the Next button so Enter/Space advance the tour without
    // requiring the user to mouse-click.
    next.focus({ preventScroll: true });
  }

  private position(): void {
    if (!this.tooltip) return;
    const step = STEPS[this.idx];
    const target = document.querySelector(step.target) as HTMLElement | null;

    document
      .querySelectorAll(".tour-highlighted")
      .forEach((el) => el.classList.remove("tour-highlighted"));
    if (target) target.classList.add("tour-highlighted");

    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    const margin = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top: number;
    let left: number;

    if (target) {
      const r = target.getBoundingClientRect();
      const spaceBelow = vh - r.bottom;
      const spaceAbove = r.top;

      // Prefer below the target; fall back above; if neither fits,
      // bottom-center the tooltip so the buttons are guaranteed visible.
      if (spaceBelow >= th + margin) {
        top = r.bottom + margin;
      } else if (spaceAbove >= th + margin) {
        top = r.top - th - margin;
      } else {
        top = vh - th - margin;
      }
      left = r.left + r.width / 2 - tw / 2;
      left = Math.max(margin, Math.min(vw - tw - margin, left));
    } else {
      // No target: centre at bottom of viewport.
      top = vh - th - margin;
      left = (vw - tw) / 2;
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }
}
