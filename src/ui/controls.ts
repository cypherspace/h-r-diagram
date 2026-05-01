import type { AxisConfig } from "../types";
import { listDiagrams } from "../store/diagrams";

export interface ControlsCallbacks {
  onAxesChange: (axes: AxisConfig) => void;
  onClearAll: () => void;
  onClearSelected: () => void;
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
}

export class Controls {
  private container: HTMLElement;
  private cb: ControlsCallbacks;
  private axes: AxisConfig;
  private savedSelect!: HTMLSelectElement;

  constructor(
    container: HTMLElement,
    initialAxes: AxisConfig,
    cb: ControlsCallbacks,
  ) {
    this.container = container;
    this.cb = cb;
    this.axes = initialAxes;
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
        "Y",
        [
          ["luminosity", "Luminosity (L/L⊙)"],
          ["absoluteMagnitude", "Absolute magnitude"],
        ],
        this.axes.yMode,
        (v) => {
          this.axes = { ...this.axes, yMode: v as AxisConfig["yMode"] };
          this.cb.onAxesChange(this.axes);
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
        "X",
        [
          ["temperature", "Temperature (K)"],
          ["bv", "B − V color"],
        ],
        this.axes.xMode,
        (v) => {
          this.axes = { ...this.axes, xMode: v as AxisConfig["xMode"] };
          this.cb.onAxesChange(this.axes);
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

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
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
