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
    this.savedSelect.innerHTML =
      '<option value="">— saved diagrams —</option>' +
      diagrams
        .map(
          (d) =>
            `<option value="${escape(d.name)}">${escape(d.name)}</option>`,
        )
        .join("");
  }

  setAxes(axes: AxisConfig): void {
    this.axes = axes;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = "";

    this.container.appendChild(
      this.makeSelect(
        "Y axis",
        [
          ["luminosity", "Brightness (× the Sun)"],
          ["absoluteMagnitude", "Absolute magnitude"],
        ],
        this.axes.yMode,
        (v) => {
          const yMode = v as AxisConfig["yMode"];
          // Pick a sensible scale to match the new axis mode.
          const yScale: AxisConfig["yScale"] =
            yMode === "luminosity" ? "log" : "linear";
          this.axes = { ...this.axes, yMode, yScale };
          this.cb.onAxesChange(this.axes);
          this.render();
        },
      ),
    );

    this.container.appendChild(
      this.makeSelect(
        "Y scale",
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

    this.container.appendChild(
      this.makeSelect(
        "X axis",
        [
          ["temperature", "Temperature (K)"],
          ["bv", "Colour (B − V)"],
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

    this.container.appendChild(
      this.makeSelect(
        "X scale",
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

    this.container.appendChild(
      this.makeSelect(
        "Dot size",
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

    const zoomGroup = document.createElement("span");
    zoomGroup.className = "zoom-group";
    zoomGroup.append(
      button("−", () => this.cb.onZoomOut(), "Zoom out"),
      button("+", () => this.cb.onZoomIn(), "Zoom in"),
      button("Reset zoom", () => this.cb.onZoomReset()),
    );
    this.container.appendChild(zoomGroup);

    const clearAll = button("Clear all", () => this.cb.onClearAll());
    this.container.appendChild(clearAll);

    const clearSel = button("Remove selected", () => this.cb.onClearSelected());
    this.container.appendChild(clearSel);

    const sep = document.createElement("span");
    sep.style.borderLeft = "1px solid var(--grid)";
    sep.style.height = "1.5rem";
    sep.style.margin = "0 0.25rem";
    this.container.appendChild(sep);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "diagram name";
    nameInput.style.width = "9rem";
    this.container.appendChild(nameInput);

    this.container.appendChild(
      button("Save", () => {
        const name = nameInput.value.trim();
        if (!name) {
          alert("Enter a name to save.");
          return;
        }
        this.cb.onSave(name);
        this.refreshSavedList();
      }),
    );

    const savedSelect = document.createElement("select");
    this.savedSelect = savedSelect;
    this.container.appendChild(savedSelect);

    this.container.appendChild(
      button("Load", () => {
        const name = savedSelect.value;
        if (!name) return;
        this.cb.onLoad(name);
      }),
    );

    this.container.appendChild(
      button("Delete", () => {
        const name = savedSelect.value;
        if (!name) return;
        if (!confirm(`Delete "${name}"?`)) return;
        this.cb.onDelete(name);
        this.refreshSavedList();
      }),
    );

    this.refreshSavedList();
  }

  private makeSelect(
    label: string,
    opts: Array<[string, string]>,
    value: string,
    onChange: (v: string) => void,
  ): HTMLLabelElement {
    const wrap = document.createElement("label");
    wrap.append(label);
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

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
}
