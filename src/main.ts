import "./style.css";
import { SAMPLE_STARS, findStarById } from "./data/sampleStars";
import { plotStar } from "./data/derive";
import {
  GaiaError,
  gaiaRowToStar,
  queryConeSearch,
} from "./data/gaia";
import { HRDiagram } from "./ui/hrDiagram";
import { DataPanel } from "./ui/dataPanel";
import { Controls } from "./ui/controls";
import { SkyViewer, type CandidateStar } from "./ui/skyViewer";
import { Walkthrough } from "./ui/walkthrough";
import {
  deleteDiagram,
  loadDiagram,
  saveDiagram,
} from "./store/diagrams";
import type { AxisConfig, PlottedStar, Star } from "./types";

const MAX_PLOTTED = 500;

const defaultAxes: AxisConfig = {
  yMode: "luminosity",
  xMode: "temperature",
  yScale: "log",
  xScale: "log",
};

class App {
  private axes: AxisConfig = defaultAxes;
  private plotted = new Map<string, PlottedStar>();
  private selectedId: string | null = null;
  private diagram: HRDiagram;
  private dataPanel: DataPanel;
  private controls: Controls;
  private skyViewer: SkyViewer;
  private catalogList: HTMLUListElement;
  private skyStatusEl: HTMLElement;
  private inflightGaia: AbortController | null = null;

  constructor() {
    const diagramEl = mustGet("diagram");
    const controlsEl = mustGet("diagram-controls");
    const dataEl = mustGet("data-panel");
    const aladinEl = mustGet("aladin-lite-div");
    this.skyStatusEl = mustGet("sky-status");
    this.catalogList = mustGet("catalog-list") as HTMLUListElement;

    this.dataPanel = new DataPanel(dataEl);
    this.dataPanel.showEmpty();

    this.diagram = new HRDiagram({
      container: diagramEl,
      axes: this.axes,
      onPointClick: (s) => {
        this.select(s.id);
        this.skyViewer.gotoRaDec(s.ra, s.dec);
      },
    });

    this.controls = new Controls(controlsEl, this.axes, {
      onAxesChange: (axes) => {
        this.axes = axes;
        this.diagram.setAxes(axes);
      },
      onClearAll: () => this.clearAll(),
      onClearSelected: () => this.clearSelected(),
      onSave: (name) => this.save(name),
      onLoad: (name) => this.load(name),
      onDelete: (name) => deleteDiagram(name),
    });

    this.skyViewer = new SkyViewer({
      container: aladinEl,
      initialTarget: "Pleiades",
      initialSurvey: "P/DSS2/color",
      initialFov: 60,
      onSampleClick: (star) => this.toggleStar(star),
      onCandidateClick: (star) => this.commitCandidate(star),
      onStatus: (msg) => {
        this.skyStatusEl.textContent = msg;
      },
    });
    void this.skyViewer.setSampleStars(SAMPLE_STARS);

    this.wireSkyControls();
    this.renderCatalog();
    this.refresh();

    const tourBtn = document.getElementById("tour-btn");
    tourBtn?.addEventListener("click", () => {
      Walkthrough.reset();
      new Walkthrough().start();
    });

    if (!Walkthrough.hasBeenSeen()) {
      // Defer so the sky viewer container has rendered.
      setTimeout(() => new Walkthrough().start(), 600);
    }
  }

  private wireSkyControls(): void {
    const gotoInput = mustGet("goto-input") as HTMLInputElement;
    const gotoBtn = mustGet("goto-btn") as HTMLButtonElement;
    const surveySelect = mustGet("survey-select") as HTMLSelectElement;
    const searchBtn = mustGet("search-btn") as HTMLButtonElement;
    const addAllBtn = mustGet("add-all-btn") as HTMLButtonElement;
    const clearCandidatesBtn = mustGet("clear-candidates-btn") as HTMLButtonElement;
    const regionLimit = mustGet("region-limit") as HTMLInputElement;

    const fire = () => {
      const target = gotoInput.value.trim();
      if (target) void this.skyViewer.goto(target);
    };
    gotoBtn.addEventListener("click", fire);
    gotoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") fire();
    });
    surveySelect.addEventListener("change", () => {
      void this.skyViewer.setSurvey(surveySelect.value);
    });
    searchBtn.addEventListener("click", () => {
      const limit = clamp(parseInt(regionLimit.value, 10) || 50, 1, 500);
      void this.searchVisibleRegion(limit);
    });
    addAllBtn.addEventListener("click", () => this.addAllCandidates());
    clearCandidatesBtn.addEventListener("click", () => {
      this.skyViewer.clearCandidates();
      this.skyStatusEl.textContent = "Search results cleared.";
    });
  }

  private renderCatalog(): void {
    this.catalogList.innerHTML = "";
    for (const star of SAMPLE_STARS) {
      const li = document.createElement("li");
      li.dataset.id = star.id;
      const name = document.createElement("span");
      name.textContent = star.name;
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = star.spectralType ?? "";
      li.append(name, meta);
      li.addEventListener("click", () => this.toggleStar(star));
      this.catalogList.appendChild(li);
    }
    this.refreshCatalogState();
  }

  private refreshCatalogState(): void {
    for (const li of Array.from(
      this.catalogList.querySelectorAll<HTMLLIElement>("li"),
    )) {
      li.classList.toggle("added", this.plotted.has(li.dataset.id ?? ""));
    }
  }

  private toggleStar(star: Star): void {
    if (this.plotted.has(star.id)) {
      this.select(star.id);
      return;
    }
    this.plotted.set(star.id, plotStar(star));
    this.select(star.id);
    this.refresh();
  }

  private select(id: string | null): void {
    this.selectedId = id;
    this.diagram.setSelected(id);
    if (id) {
      const s = this.plotted.get(id) ?? findStarById(id);
      if (s) this.dataPanel.show(s);
    } else {
      this.dataPanel.showEmpty();
    }
  }

  private clearAll(): void {
    this.plotted.clear();
    this.selectedId = null;
    this.dataPanel.showEmpty();
    this.refresh();
  }

  private clearSelected(): void {
    if (!this.selectedId) return;
    this.plotted.delete(this.selectedId);
    this.selectedId = null;
    this.dataPanel.showEmpty();
    this.refresh();
  }

  private async searchVisibleRegion(limit: number): Promise<void> {
    const center = await this.skyViewer.getCenter();
    const fov = await this.skyViewer.getFov();
    if (!center || !fov) {
      this.skyStatusEl.textContent = "Sky viewer not ready.";
      return;
    }
    const [ra, dec] = center;
    // Use the larger FOV axis / 2 so the cone covers the diagonals; cap to
    // keep the query bounded.
    const radius = Math.min(Math.max(fov[0], fov[1]) / 2, 1.5);
    this.inflightGaia?.abort();
    const ctrl = new AbortController();
    this.inflightGaia = ctrl;
    this.skyStatusEl.textContent = `Searching Gaia (radius ${radius.toFixed(2)}°, top ${limit})…`;
    try {
      const rows = await queryConeSearch(ra, dec, radius, {
        topN: limit,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      // Drop rows already plotted so the user only sees new candidates.
      const candidates: CandidateStar[] = [];
      for (const row of rows) {
        const star = gaiaRowToStar(row);
        if (!this.plotted.has(star.id)) candidates.push(star);
      }
      await this.skyViewer.setCandidates(candidates);
      this.skyStatusEl.textContent =
        candidates.length > 0
          ? `Found ${candidates.length} candidate(s). Click a marker to add one, or "Add all".`
          : "No new Gaia stars in that region.";
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const msg =
        e instanceof GaiaError
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);
      this.skyStatusEl.textContent = `Gaia search failed: ${msg}`;
    } finally {
      if (this.inflightGaia === ctrl) this.inflightGaia = null;
    }
  }

  private commitCandidate(star: CandidateStar): void {
    if (this.plotted.size >= MAX_PLOTTED) {
      this.skyStatusEl.textContent = `Diagram already has ${MAX_PLOTTED} stars.`;
      return;
    }
    if (!this.plotted.has(star.id)) {
      this.plotted.set(star.id, plotStar(star));
    }
    this.skyViewer.removeCandidate(star.id);
    this.select(star.id);
    this.refresh();
    this.skyStatusEl.textContent = `Added ${star.name}.`;
  }

  private addAllCandidates(): void {
    const candidates = this.skyViewer.getCandidates();
    if (candidates.length === 0) {
      this.skyStatusEl.textContent = "No search results to add. Hit Search first.";
      return;
    }
    let added = 0;
    for (const star of candidates) {
      if (this.plotted.size >= MAX_PLOTTED) break;
      if (!this.plotted.has(star.id)) {
        this.plotted.set(star.id, plotStar(star));
        added++;
      }
    }
    this.skyViewer.clearCandidates();
    this.refresh();
    this.skyStatusEl.textContent = `Added ${added} stars from search results.`;
  }

  private save(name: string): void {
    const stars: Star[] = Array.from(this.plotted.values()).map((p) => ({
      id: p.id,
      name: p.name,
      ra: p.ra,
      dec: p.dec,
      mV: p.mV,
      distancePc: p.distancePc,
      teff: p.teff,
      bv: p.bv,
      spectralType: p.spectralType,
      notes: p.notes,
    }));
    saveDiagram(name, stars, this.axes);
  }

  private load(name: string): void {
    const saved = loadDiagram(name);
    if (!saved) return;
    this.plotted.clear();
    for (const star of saved.stars) {
      this.plotted.set(star.id, plotStar(star));
    }
    this.axes = saved.axes;
    this.controls.setAxes(saved.axes);
    this.diagram.setAxes(saved.axes);
    this.selectedId = null;
    this.dataPanel.showEmpty();
    this.refresh();
  }

  private refresh(): void {
    this.diagram.setStars(Array.from(this.plotted.values()));
    this.diagram.setSelected(this.selectedId);
    this.refreshCatalogState();
  }
}

function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

new App();
