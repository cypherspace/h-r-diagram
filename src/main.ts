import "./style.css";
import { STAR_SETS, findStarById, type StarSet } from "./data/sampleStars";
import { plotStar } from "./data/derive";
import {
  GaiaError,
  gaiaRowToStar,
  queryConeSearch,
} from "./data/gaia";
import { lookupSimbadName } from "./data/simbad";
import { HRDiagram } from "./ui/hrDiagram";
import { DataPanel } from "./ui/dataPanel";
import { Controls } from "./ui/controls";
import { SkyViewer, type CandidateStar } from "./ui/skyViewer";
import { Walkthrough } from "./ui/walkthrough";
import { HowItWorks } from "./ui/howItWorks";
import { HowWeKnow } from "./ui/howWeKnow";
import { DiagramGuide } from "./ui/diagramGuide";
import {
  deleteDiagram,
  loadDiagram,
  saveDiagram,
} from "./store/diagrams";
import type { AxisConfig, PlottedStar, Star } from "./types";

const MAX_PLOTTED = 5000;
const DEFAULT_DOT_SIZE = 5;

const defaultAxes: AxisConfig = {
  yMode: "luminosity",
  xMode: "temperature",
  yScale: "log",
  xScale: "log",
  yLabelFormat: "decimals",
  yUnit: "solar",
};

class App {
  private axes: AxisConfig = defaultAxes;
  private dotSize = DEFAULT_DOT_SIZE;
  private plotted = new Map<string, PlottedStar>();
  private selectedId: string | null = null;
  private diagram: HRDiagram;
  private dataPanel: DataPanel;
  private controls: Controls;
  private skyViewer: SkyViewer;
  private starSetsContainer: HTMLElement;
  private skyStatusEl: HTMLElement;
  private inflightGaia: AbortController | null = null;
  // Cache of source_id → resolved SIMBAD name (or "" if SIMBAD had no
  // entry, so we don't keep re-querying for the same star).
  private simbadCache = new Map<string, string>();

  constructor() {
    const diagramEl = mustGet("diagram");
    const controlsEl = mustGet("diagram-controls");
    const dataEl = mustGet("data-panel");
    const aladinEl = mustGet("aladin-lite-div");
    this.skyStatusEl = mustGet("sky-status");
    this.starSetsContainer = mustGet("star-sets");

    this.dataPanel = new DataPanel(dataEl);
    this.dataPanel.showEmpty();

    this.diagram = new HRDiagram({
      container: diagramEl,
      axes: this.axes,
      dotSize: this.dotSize,
      onPointClick: (s) => {
        this.select(s.id);
        this.skyViewer.gotoRaDec(s.ra, s.dec);
      },
    });

    this.controls = new Controls(controlsEl, this.axes, this.dotSize, {
      onAxesChange: (axes) => {
        this.axes = axes;
        this.diagram.setAxes(axes);
      },
      onClearAll: () => this.clearAll(),
      onClearSelected: () => this.clearSelected(),
      onSave: (name) => this.save(name),
      onLoad: (name) => this.load(name),
      onDelete: (name) => deleteDiagram(name),
      onDotSizeChange: (n) => {
        this.dotSize = n;
        this.diagram.setDotSize(n);
      },
      onZoomIn: () => this.diagram.zoomIn(),
      onZoomOut: () => this.diagram.zoomOut(),
      onZoomReset: () => this.diagram.resetZoom(),
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
    void this.skyViewer.registerSets(STAR_SETS);

    this.wireSkyControls();
    this.renderStarSets();
    this.refresh();

    const tourBtn = document.getElementById("tour-btn");
    tourBtn?.addEventListener("click", () => {
      Walkthrough.reset();
      new Walkthrough().start();
    });
    const howBtn = document.getElementById("how-btn");
    howBtn?.addEventListener("click", () => {
      new HowItWorks().open();
    });
    const howWeKnowBtn = document.getElementById("how-we-know-btn");
    howWeKnowBtn?.addEventListener("click", () => {
      new HowWeKnow().open();
    });
    const guideBtn = document.getElementById(
      "diagram-guide-btn",
    ) as HTMLButtonElement | null;
    guideBtn?.addEventListener("click", () => {
      if (guideBtn.disabled) return;
      new DiagramGuide({
        onSetOverlay: (mode) => this.diagram.setOverlay(mode),
        getCurrentOverlay: () => this.diagram.getOverlay(),
      }).open();
    });

    if (!Walkthrough.hasBeenSeen()) {
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
    const showConstellations = mustGet("opt-show-constellations") as HTMLInputElement;
    const showMarkers = mustGet("opt-show-markers") as HTMLInputElement;
    const showMapInfo = mustGet("opt-show-mapinfo") as HTMLInputElement;

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
    showConstellations.addEventListener("change", () => {
      this.skyViewer.setConstellationsVisible(showConstellations.checked);
    });
    showMarkers.addEventListener("change", () => {
      this.skyViewer.setAllMarkersVisible(showMarkers.checked);
    });
    showMapInfo.addEventListener("change", () => {
      document.body.classList.toggle("view-info-open", showMapInfo.checked);
    });
  }

  private renderStarSets(): void {
    this.starSetsContainer.replaceChildren();
    for (const set of STAR_SETS) {
      this.starSetsContainer.appendChild(this.renderStarSet(set));
    }
  }

  private renderStarSet(set: StarSet): HTMLElement {
    const details = document.createElement("details");
    details.className = "star-set";
    details.dataset.setId = set.id;

    const summary = document.createElement("summary");
    const swatch = document.createElement("span");
    swatch.className = "set-swatch";
    swatch.style.background = set.markerColor;
    summary.appendChild(swatch);
    const labelSpan = document.createElement("span");
    labelSpan.className = "set-label";
    labelSpan.textContent = set.label;
    summary.appendChild(labelSpan);
    const count = document.createElement("span");
    count.className = "set-count";
    count.textContent = `${set.stars.length}`;
    summary.appendChild(count);
    details.appendChild(summary);

    const desc = document.createElement("p");
    desc.className = "set-description";
    desc.textContent = set.description;
    details.appendChild(desc);

    const setActions = document.createElement("div");
    setActions.className = "set-actions";

    const addAllBtn = document.createElement("button");
    addAllBtn.type = "button";
    addAllBtn.textContent = "Add all to chart";
    addAllBtn.addEventListener("click", () => this.addSetToDiagram(set));
    setActions.appendChild(addAllBtn);

    const visToggle = document.createElement("label");
    visToggle.className = "set-vis";
    const visCb = document.createElement("input");
    visCb.type = "checkbox";
    visCb.checked = true;
    visCb.addEventListener("change", () => {
      this.skyViewer.setSetVisibility(set.id, visCb.checked);
    });
    visToggle.appendChild(visCb);
    visToggle.appendChild(document.createTextNode(" Show on sky"));
    setActions.appendChild(visToggle);

    details.appendChild(setActions);

    const list = document.createElement("ul");
    list.className = "set-stars";
    for (const star of set.stars) {
      const li = document.createElement("li");
      li.dataset.id = star.id;
      const name = document.createElement("span");
      name.className = "star-name-cell";
      name.textContent = star.name;
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = star.spectralType ?? "";
      li.append(name, meta);
      li.addEventListener("click", () => this.toggleStar(star));
      list.appendChild(li);
    }
    details.appendChild(list);

    return details;
  }

  private refreshSetStates(): void {
    for (const li of Array.from(
      this.starSetsContainer.querySelectorAll<HTMLLIElement>(".set-stars li"),
    )) {
      li.classList.toggle("added", this.plotted.has(li.dataset.id ?? ""));
    }
  }

  private addSetToDiagram(set: StarSet): void {
    let added = 0;
    for (const star of set.stars) {
      if (this.plotted.size >= MAX_PLOTTED) break;
      if (!this.plotted.has(star.id)) {
        this.plotted.set(star.id, plotStar(star));
        added++;
      }
    }
    this.refresh();
    this.skyStatusEl.textContent = `Added ${added} ${set.label.toLowerCase()} to the chart.`;
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

  private select(id: string | null, fallback?: Star): void {
    this.selectedId = id;
    this.diagram.setSelected(id);
    if (id) {
      // Try the chart, then the curated sample sets, then the fallback
      // (a freshly-clicked Gaia candidate from the sky map that isn't
      // on the chart yet). Without the fallback, clicking a candidate
      // marker just after a search showed nothing in the data panel.
      const s = this.plotted.get(id) ?? findStarById(id) ?? fallback;
      if (s) {
        this.dataPanel.show(s);
        // For Gaia stars, ask SIMBAD whether the source has a friendlier
        // name (Bayer designation, proper name, …) and update the panel
        // when it returns.
        void this.maybeResolveGaiaName(s.id);
      }
    } else {
      this.dataPanel.showEmpty();
    }
  }

  private async maybeResolveGaiaName(id: string): Promise<void> {
    if (!id.startsWith("gaia-")) return;
    const sourceId = id.slice("gaia-".length);
    let resolved = this.simbadCache.get(sourceId);
    if (resolved == null) {
      const result = await lookupSimbadName(sourceId);
      resolved = result?.display ?? "";
      this.simbadCache.set(sourceId, resolved);
    }
    if (!resolved) return;
    const plotted = this.plotted.get(id);
    if (plotted) {
      if (plotted.name !== resolved) plotted.name = resolved;
      plotted.resolved = true;
    }
    // Repaint the data panel only if this star is still selected.
    if (this.selectedId === id) {
      const s = this.plotted.get(id) ?? findStarById(id);
      if (s) this.dataPanel.show({ ...s, name: resolved, resolved: true });
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
    // Cone search around the view centre. The radius covers the
    // diagonal of the visible viewport, capped so we don't ask for the
    // whole sky on a fully zoomed-out view.
    const radius = Math.min(Math.max(fov[0], fov[1]) / 2, 1.5);
    this.inflightGaia?.abort();
    const ctrl = new AbortController();
    this.inflightGaia = ctrl;
    this.skyStatusEl.textContent = `Searching for stars (top ${limit})…`;
    try {
      const rows = await queryConeSearch(ra, dec, radius, {
        topN: limit,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      const candidates: CandidateStar[] = [];
      for (const row of rows) {
        const star = gaiaRowToStar(row);
        if (!this.plotted.has(star.id)) candidates.push(star);
      }
      await this.skyViewer.setCandidates(candidates);
      this.skyStatusEl.textContent =
        candidates.length > 0
          ? `Found ${candidates.length} stars with data. Click a marker to add one, or "Add all".`
          : "No new stars in that region.";
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const msg =
        e instanceof GaiaError
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);
      this.skyStatusEl.textContent = `Search failed: ${msg}`;
    } finally {
      if (this.inflightGaia === ctrl) this.inflightGaia = null;
    }
  }

  private commitCandidate(star: CandidateStar): void {
    if (this.plotted.size >= MAX_PLOTTED) {
      this.skyStatusEl.textContent = `Chart already has ${MAX_PLOTTED} stars.`;
      return;
    }
    // Show the data panel either way (passing `star` as fallback so the
    // panel resolves even when the star isn't yet on the chart), but
    // only add to the chart if we know the star's temperature.
    this.select(star.id, star);
    if (star.teff == null) {
      this.skyStatusEl.textContent =
        `${star.name}: temperature unknown — cannot place on the chart.`;
      return;
    }
    if (!this.plotted.has(star.id)) {
      this.plotted.set(star.id, plotStar(star));
    }
    this.skyViewer.removeCandidate(star.id);
    this.refresh();
    this.skyStatusEl.textContent = `Added ${star.name}.`;
  }

  private addAllCandidates(): void {
    const candidates = this.skyViewer.getCandidates();
    if (candidates.length === 0) {
      this.skyStatusEl.textContent = "No search results to add. Try Search first.";
      return;
    }
    let added = 0;
    let skipped = 0;
    for (const star of candidates) {
      if (this.plotted.size >= MAX_PLOTTED) break;
      if (star.teff == null) {
        skipped++;
        continue;
      }
      if (!this.plotted.has(star.id)) {
        this.plotted.set(star.id, plotStar(star));
        added++;
      }
    }
    this.skyViewer.clearCandidates();
    this.refresh();
    this.skyStatusEl.textContent =
      skipped > 0
        ? `Added ${added} stars; skipped ${skipped} with unknown temperature.`
        : `Added ${added} stars from search results.`;
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
    this.refreshSetStates();
    this.refreshGuideButton();
  }

  // Enable the "Diagram guide" button once the user has enough stars
  // plotted that the H-R diagram's structure (main sequence, red giants,
  // white dwarfs) is actually visible — otherwise the explanation has
  // nothing to point at.
  private static readonly GUIDE_THRESHOLD = 200;

  private refreshGuideButton(): void {
    const btn = document.getElementById(
      "diagram-guide-btn",
    ) as HTMLButtonElement | null;
    if (!btn) return;
    const have = this.plotted.size;
    const need = App.GUIDE_THRESHOLD;
    if (have >= need) {
      btn.disabled = false;
      btn.title = "A guide to the regions of the H-R diagram.";
    } else {
      btn.disabled = true;
      const remaining = need - have;
      btn.title = `Plot ${remaining} more star${remaining === 1 ? "" : "s"} to unlock this guide (${have} / ${need}).`;
    }
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
