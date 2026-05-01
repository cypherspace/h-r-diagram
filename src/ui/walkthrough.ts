interface Step {
  target: string;
  title: string;
  body: string;
}

const STORAGE_KEY = "hrd:tour-seen:v3";

const STEPS: Step[] = [
  {
    target: "#sky-panel",
    title: "Welcome!",
    body:
      "This tool helps you explore real stars and see how they fit on a " +
      "famous chart called the Hertzsprung–Russell (H-R) diagram. On the " +
      "left is a window onto the real night sky; on the right is the chart " +
      "you'll build up as you pick stars.",
  },
  {
    target: "#diagram",
    title: "What is the H-R diagram?",
    body:
      "It's a graph that compares stars by their temperature (across) and " +
      "their brightness (up the side). When you plot lots of stars, they " +
      "fall into clear groups — like the main sequence, red giants, and " +
      "white dwarfs. That's the big idea you're about to discover.",
  },
  {
    target: "#goto-input",
    title: "Find a part of the sky",
    body:
      'Type the name of a star or star cluster (try "M45" for the Pleiades, ' +
      'or "Sirius") and press Go. You can also drag the sky to move it and ' +
      "scroll to zoom in or out.",
  },
  {
    target: "#search-btn",
    title: "Search for stars",
    body:
      "Once you've found a part of the sky you like, press Search. The app " +
      "looks up real stars in that area and marks them as little blue " +
      "crosses. Nothing has been added to the chart yet — you're in control.",
  },
  {
    target: "#add-all-btn",
    title: "Add stars to the chart",
    body:
      'Click a single blue cross to add just that star, or press "Add all" ' +
      "to add the whole bunch. You can also pick from the named star sets " +
      "in the side panel (Sun-like stars, red dwarfs, white dwarfs, …) " +
      "to watch each group appear in its own part of the chart.",
  },
  {
    target: "#diagram",
    title: "Watch the patterns appear",
    body:
      "Each dot is drawn in the colour the star really looks (red for cool " +
      "stars, blue for very hot ones). Click any dot to see that star's " +
      "info on the right and to recentre the sky on it.",
  },
  {
    target: "#info-panel",
    title: "Read the star's info",
    body:
      "Pick any star and you'll see its temperature, brightness, distance " +
      "and a small picture of where it sits in the sky. The chart options " +
      "below the graph let you switch between brightness and magnitude, " +
      "and save your chart to come back to later.",
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
