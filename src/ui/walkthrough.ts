interface Step {
  target: string; // CSS selector
  title: string;
  body: string;
}

const STORAGE_KEY = "hrd:tour-seen:v1";

const STEPS: Step[] = [
  {
    target: "#sky-panel",
    title: "Welcome",
    body:
      "This tool plots real stars on a Hertzsprung–Russell diagram. " +
      "On the left is a window onto the night sky.",
  },
  {
    target: "#goto-input",
    title: "Pick a region",
    body:
      'Type the name of a star or cluster (try "M45" or "Sirius") and ' +
      "press Go. The viewer also pans by drag and zooms with scroll.",
  },
  {
    target: "#aladin-lite-div",
    title: "Click a star",
    body:
      "Click anywhere on the sky — the app queries the Gaia DR3 catalog " +
      "at that point and adds the brightest matching star to the diagram. " +
      "Yellow circles are pre-loaded reference stars; click them too.",
  },
  {
    target: "#diagram",
    title: "The H-R diagram",
    body:
      "Stars appear here. The Y axis is luminosity (or absolute magnitude); " +
      "the X axis is temperature (or B–V colour). Click a point to highlight " +
      "the star and recenter the sky on it.",
  },
  {
    target: "#add-region-btn",
    title: "Plot a whole cluster",
    body:
      "Once you've zoomed onto a cluster, this button queries Gaia for the " +
      "brightest stars in the visible region and plots all of them — watch " +
      "the main sequence appear.",
  },
  {
    target: "#info-panel",
    title: "Inspect & save",
    body:
      "The selected star's full data is here. Use the controls under the " +
      "diagram to switch axes, clear points, and save your diagram.",
  },
];

export class Walkthrough {
  private overlay?: HTMLElement;
  private tooltip?: HTMLElement;
  private idx = 0;
  private resizeHandler = () => this.position();

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
      // ignore quota / disabled storage
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
    if (this.overlay) return;
    this.idx = 0;
    this.overlay = document.createElement("div");
    this.overlay.className = "tour-overlay";
    this.tooltip = document.createElement("div");
    this.tooltip.className = "tour-tooltip";
    this.overlay.appendChild(this.tooltip);
    document.body.appendChild(this.overlay);
    window.addEventListener("resize", this.resizeHandler);
    this.render();
  }

  private end(): void {
    Walkthrough.markSeen();
    this.overlay?.remove();
    this.overlay = undefined;
    this.tooltip = undefined;
    window.removeEventListener("resize", this.resizeHandler);
  }

  private render(): void {
    if (!this.tooltip) return;
    const step = STEPS[this.idx];
    const isLast = this.idx === STEPS.length - 1;
    // STEPS are static module data; safe to interpolate without escaping.
    this.tooltip.replaceChildren();
    const h3 = document.createElement("h3");
    h3.textContent = step.title;
    const p = document.createElement("p");
    p.textContent = step.body;
    const actions = document.createElement("div");
    actions.className = "tour-actions";
    const skip = document.createElement("button");
    skip.className = "tour-skip";
    skip.textContent = "Skip";
    const progress = document.createElement("span");
    progress.className = "tour-progress";
    progress.textContent = `${this.idx + 1} / ${STEPS.length}`;
    const next = document.createElement("button");
    next.className = "tour-next";
    next.textContent = isLast ? "Done" : "Next";
    actions.append(skip, progress, next);
    this.tooltip.append(h3, p, actions);
    skip.addEventListener("click", () => this.end());
    next.addEventListener("click", () => {
      if (isLast) {
        this.end();
      } else {
        this.idx++;
        this.render();
      }
    });
    this.position();
  }

  private position(): void {
    if (!this.tooltip) return;
    const step = STEPS[this.idx];
    const target = document.querySelector(step.target) as HTMLElement | null;
    if (!target) return;
    const r = target.getBoundingClientRect();
    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    const margin = 12;

    let top = r.bottom + margin;
    if (top + th > window.innerHeight - margin) {
      top = Math.max(margin, r.top - th - margin);
    }
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(margin, Math.min(window.innerWidth - tw - margin, left));

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;

    // Highlight the target via box-shadow.
    document.querySelectorAll(".tour-highlighted").forEach((el) =>
      el.classList.remove("tour-highlighted"),
    );
    target.classList.add("tour-highlighted");
  }
}
