import type { AxisConfig } from "../types";
import { listDiagrams } from "../store/diagrams";

export interface ControlsCallbacks {
  onAxesChange: (axes: AxisConfig) => void;
  onClearAll: () => void;
  onClearSelected: () => void;
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  onDotSizeChange: (size: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export class Controls {
  private container: HTMLElement;
  private cb: ControlsCallbacks;
  private axes: AxisConfig;
  private dotSize: number;
  private savedSelect!: HTMLSelectElement;

  constructor(
    container: HTMLElement,
    initialAxes: AxisConfig,
    initialDotSize: number,
    cb: ControlsCallbacks,
  ) {
    this.container = container;
    this.cb = cb;
    this.axes = initialAxes;
    this.dotSize = initialDotSize;
    this.render();
  }

  refreshSavedList(): void {
    const diagrams = listDiagrams();
    this.savedSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "— saved charts —";
    this.savedSelect.appendChild(placeholder);
    for (const d of diagrams) {
      const o = document.createElement("option");
      o.value = d.name;
      o.textContent = d.name;
      this.savedSelect.appendChild(o);
    }
  }

  setAxes(axes: AxisConfig): void {
    this.axes = axes;
    this.render();
  }

  private render(): void {
    this.container.replaceChildren();

    // ---- group: axes ----
    const axesGroup = group("Axes");
    axesGroup.appendChild(
      this.makeSelect(
        "Y",
        [
          ["luminosity", "Brightness (× the Sun)"],
          ["absoluteMagnitude", "Absolute magnitude"],
        ],
        this.axes.yMode,
        (v) => {
          const yMode = v as AxisConfig["yMode"];
          const yScale: AxisConfig["yScale"] =
            yMode === "luminosity" ? "log" : "linear";
          this.axes = { ...this.axes, yMode, yScale };
          this.cb.onAxesChange(this.axes);
          this.render();
        },
      ),
    );
    axesGroup.appendChild(
      this.makeSelect(
        "scale",
        [
          ["log", "log"],
          ["linear", "linear"],
        ],
        this.axes.yScale,
        (v) => {
          this.axes = { ...this.axes, yScale: v as AxisConfig["yScale"] };
          this.cb.onAxesChange(this.axes);
        },
      ),
    );
    axesGroup.appendChild(
      this.makeSelect(
        "X",
        [
          ["temperature", "Temperature (K)"],
          ["bv", "Colour"],
        ],
        this.axes.xMode,
        (v) => {
          const xMode = v as AxisConfig["xMode"];
          const xScale: AxisConfig["xScale"] =
            xMode === "temperature" ? "log" : "linear";
          this.axes = { ...this.axes, xMode, xScale };
          this.cb.onAxesChange(this.axes);
          this.render();
        },
      ),
    );
    // X-scale dropdown is meaningless in Colour mode (the axis is
    // categorical bands), so only show it for the temperature axis.
    if (this.axes.xMode === "temperature") {
      axesGroup.appendChild(
        this.makeSelect(
          "scale",
          [
            ["log", "log"],
            ["linear", "linear"],
          ],
          this.axes.xScale,
          (v) => {
            this.axes = { ...this.axes, xScale: v as AxisConfig["xScale"] };
            this.cb.onAxesChange(this.axes);
          },
        ),
      );
    }
    this.container.appendChild(axesGroup);

    // ---- group: display ----
    const displayGroup = group("Display");
    displayGroup.appendChild(
      this.makeSelect(
        "Dots",
        [
          ["2", "tiny"],
          ["3", "small"],
          ["5", "medium"],
          ["7", "large"],
        ],
        String(this.dotSize),
        (v) => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n)) {
            this.dotSize = n;
            this.cb.onDotSizeChange(n);
          }
        },
      ),
    );
    const zoomCluster = document.createElement("span");
    zoomCluster.className = "control-cluster";
    const zLabel = document.createElement("span");
    zLabel.className = "control-cluster-label";
    zLabel.textContent = "Zoom";
    zoomCluster.append(
      zLabel,
      button("−", () => this.cb.onZoomOut(), "Zoom out"),
      button("+", () => this.cb.onZoomIn(), "Zoom in"),
      button("Reset", () => this.cb.onZoomReset(), "Reset zoom"),
    );
    displayGroup.appendChild(zoomCluster);
    this.container.appendChild(displayGroup);

    // ---- group: edit ----
    const editGroup = group("Edit");
    editGroup.appendChild(button("Clear all", () => this.cb.onClearAll()));
    editGroup.appendChild(
      button("Remove selected", () => this.cb.onClearSelected()),
    );
    this.container.appendChild(editGroup);

    // ---- group: save / load ----
    const saveGroup = group("Save & load");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "chart name";
    nameInput.className = "save-name";
    saveGroup.appendChild(nameInput);
    saveGroup.appendChild(
      button("Save", () => {
        const name = nameInput.value.trim();
        if (!name) {
          alert("Enter a name to save the chart.");
          return;
        }
        this.cb.onSave(name);
        this.refreshSavedList();
      }),
    );
    const savedSelect = document.createElement("select");
    this.savedSelect = savedSelect;
    saveGroup.appendChild(savedSelect);
    saveGroup.appendChild(
      button("Load", () => {
        const name = savedSelect.value;
        if (!name) return;
        this.cb.onLoad(name);
      }),
    );
    saveGroup.appendChild(
      button("Delete", () => {
        const name = savedSelect.value;
        if (!name) return;
        if (!confirm(`Delete "${name}"?`)) return;
        this.cb.onDelete(name);
        this.refreshSavedList();
      }),
    );
    this.container.appendChild(saveGroup);

    this.refreshSavedList();
  }

  private makeSelect(
    label: string,
    opts: Array<[string, string]>,
    value: string,
    onChange: (v: string) => void,
  ): HTMLLabelElement {
    const wrap = document.createElement("label");
    wrap.className = "control-pair";
    const span = document.createElement("span");
    span.textContent = label;
    wrap.appendChild(span);
    const sel = document.createElement("select");
    for (const [v, t] of opts) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      if (v === value) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", () => onChange(sel.value));
    wrap.appendChild(sel);
    return wrap;
  }
}

function group(title: string): HTMLElement {
  const div = document.createElement("div");
  div.className = "control-group";
  const heading = document.createElement("span");
  heading.className = "control-group-heading";
  heading.textContent = title;
  div.appendChild(heading);
  return div;
}

function button(
  label: string,
  onClick: () => void,
  title?: string,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  if (title) b.title = title;
  b.addEventListener("click", onClick);
  return b;
}
