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
      "their brightness (up the side). When you plot lots of stars, you " +
      "start to see patterns in the way the stars appear on the graph. " +
      "These patterns gave astronomers clues about how stars are born, " +
      "live, and die, and they'll give you the same clues.",
  },
  {
    target: "#goto-input",
    title: "Find a part of the sky",
    body:
      'Type the name of a star, star cluster, or constellation (try "M45" ' +
      'for the Pleiades, or "Sirius") and press Go. You can also drag the ' +
      "sky to move it and scroll to zoom in or out.",
  },
  {
    target: "#search-btn",
    title: "Search for stars",
    body:
      "Once you've found a part of the sky you like, press Search. The app " +
      "looks up stars in that area that we have data about, and marks them " +
      "as little blue crosses.",
  },
  {
    target: "#add-all-btn",
    title: "Add stars to the chart",
    body:
      "Once you've found some stars with data, you can start building " +
      "your diagram. Click a star's blue cross. It'll add it to the " +
      "diagram, and also show some data about this star in the " +
      "right-hand pane.\n\n" +
      'If you want to add lots to the diagram at once, you can click ' +
      '"Add all".\n\n' +
      "If you don't know where to start, we've added some highlighted " +
      "stars for you; click a few and you might find one you've heard " +
      "of.",
  },
  {
    target: "#diagram",
    title: "Watch the patterns appear",
    body:
      "Every dot represents a star in its real colour. You'll see that " +
      "hotter stars look bluer; cooler stars look redder.\n\n" +
      "Once you've added some star dots, click any dot to see that " +
      "star's info again. You'll also recentre the sky view on it.\n\n" +
      "You can scroll around and zoom in to different areas of the " +
      "graph. There are also some options to help you get it to look " +
      "the way you're most familiar with.",
  },
  {
    target: "#info-panel",
    title: "Read the star's info",
    body:
      "Here, you can pick any star and you'll see its temperature, " +
      "brightness, distance, diameter, and a small picture of where " +
      "it sits in the sky.\n\n" +
      "You can also see magnitude and spectral class.\n\n" +
      "If a star has its own Wikipedia entry, you'll be able to see " +
      "that here too, and we'll also show you ways to find out even " +
      "more about any particular star that you find interesting.\n\n" +
      "Finally, this is also the place where you can find all those " +
      "interesting stars we highlight on the map, but grouped together " +
      "in categories. Add an entire category to the graph if you like — " +
      "you might find patterns appearing quite quickly…",
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

    const paragraphs = step.body.split("\n\n").map((para) => {
      const p = document.createElement("p");
      p.textContent = para;
      return p;
    });

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
    this.tooltip.append(h3, ...paragraphs, actions);

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
