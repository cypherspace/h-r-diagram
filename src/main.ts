import "./style.css";
import { SAMPLE_STARS, findStarById } from "./data/sampleStars";
import { plotStar } from "./data/derive";
import { HRDiagram } from "./ui/hrDiagram";
import { DataPanel } from "./ui/dataPanel";
import { Controls } from "./ui/controls";
import {
  deleteDiagram,
  loadDiagram,
  saveDiagram,
} from "./store/diagrams";
import type { AxisConfig, PlottedStar, Star } from "./types";

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
  private catalogList: HTMLUListElement;

  constructor() {
    const diagramEl = mustGet("diagram");
    const controlsEl = mustGet("diagram-controls");
    const dataEl = mustGet("data-panel");
    this.catalogList = mustGet("catalog-list") as HTMLUListElement;

    this.dataPanel = new DataPanel(dataEl);
    this.dataPanel.showEmpty();

    this.diagram = new HRDiagram({
      container: diagramEl,
      axes: this.axes,
      onPointClick: (s) => this.select(s.id),
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

    this.renderCatalog();
    this.refresh();
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

  private save(name: string): void {
    const ids = Array.from(this.plotted.keys());
    saveDiagram(name, ids, this.axes);
  }

  private load(name: string): void {
    const saved = loadDiagram(name);
    if (!saved) return;
    this.plotted.clear();
    for (const id of saved.starIds) {
      const star = findStarById(id);
      if (star) this.plotted.set(id, plotStar(star));
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

new App();
