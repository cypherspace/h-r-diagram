import * as d3 from "d3";
import type { AxisConfig, PlottedStar } from "../types";
import {
  COLOUR_BANDS,
  blackbodyColor,
  tempToColourPos,
} from "../data/derive";

export interface HRDiagramOptions {
  container: HTMLElement;
  axes: AxisConfig;
  dotSize?: number;
  onPointClick?: (star: PlottedStar) => void;
}

// A region on the H-R diagram. Two shapes are supported:
//   "band" — a curved stripe (used for the main sequence). Defined by
//     control points giving the brighter and fainter edges in
//     luminosity (solar units) at each temperature; rendered as a
//     smooth Catmull-Rom area.
//   "blob" — a soft elliptical cloud (used for giants, white dwarfs,
//     and the advanced groups). Defined by a centre in (T, L) and
//     half-widths in dex of log T and log L. Rendered with a radial
//     gradient so the edges fade rather than sit on a hard polygon.
interface BandRegion {
  type: "band";
  name: string;
  color: string;
  // Each tuple is [T (K), upper L_solar, lower L_solar].
  centerline: ReadonlyArray<readonly [number, number, number]>;
  // The label sits at this (T, L) so we can place it where it makes
  // pedagogical sense (e.g. middle of the main sequence).
  labelAt: readonly [number, number];
  labelAngleDeg?: number;
}
interface BlobRegion {
  type: "blob";
  name: string;
  color: string;
  centerT: number;
  centerL: number;
  rDexT: number;
  rDexL: number;
  rotateDeg?: number;
}
type RegionDef = BandRegion | BlobRegion;

export class HRDiagram {
  private container: HTMLElement;
  private axes: AxisConfig;
  private onPointClick?: (star: PlottedStar) => void;
  private stars: PlottedStar[] = [];
  private selectedId: string | null = null;
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private root!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private resizeObserver: ResizeObserver;
  // X and Y transforms are tracked separately so the user can zoom one
  // axis without affecting the other (mousedown on the axis tick area
  // then scroll). Both default to identity; uniform wheel-zoom over the
  // plot area scales both at once.
  private xTransform: d3.ZoomTransform = d3.zoomIdentity;
  private yTransform: d3.ZoomTransform = d3.zoomIdentity;
  private heldAxis: "x" | "y" | null = null;
  private dragStart: {
    px: number;
    py: number;
    xT: d3.ZoomTransform;
    yT: d3.ZoomTransform;
  } | null = null;
  private dotSize: number;
  private clipId: string;
  // Last computed plot inner dimensions, used by the zoom-button helpers
  // so they can scale around the plot centre.
  private innerW = 0;
  private innerH = 0;
  // "none" hides the regions; "basic" shows the three classical groups
  // (main sequence / red giants / white dwarfs); "advanced" adds blue
  // giants, red dwarfs, red supergiants, the instability strip
  // (variable stars) and the sub-giant transition region.
  private overlay: "none" | "basic" | "advanced" = "none";

  // Stable handlers so we can add/remove from window cleanly.
  private onWindowMouseUp = () => {
    if (this.heldAxis !== null) {
      this.heldAxis = null;
      document.body.style.cursor = "";
    }
    this.dragStart = null;
  };
  private onWindowMouseMove = (event: MouseEvent) => {
    if (!this.dragStart) return;
    const node = this.svg.node();
    if (!node) return;
    const [mx, my] = d3.pointer(event, node);
    const margin = HRDiagram.MARGIN;
    const px = mx - margin.left;
    const py = my - margin.top;
    const dx = px - this.dragStart.px;
    const dy = py - this.dragStart.py;
    this.xTransform = d3.zoomIdentity
      .translate(this.dragStart.xT.x + dx, 0)
      .scale(this.dragStart.xT.k);
    this.yTransform = d3.zoomIdentity
      .translate(0, this.dragStart.yT.y + dy)
      .scale(this.dragStart.yT.k);
    this.render();
  };

  constructor(opts: HRDiagramOptions) {
    this.container = opts.container;
    this.axes = opts.axes;
    this.onPointClick = opts.onPointClick;
    this.dotSize = opts.dotSize ?? 5;
    this.clipId = `hrd-clip-${Math.floor(Math.random() * 1e9).toString(36)}`;

    this.svg = d3
      .select(this.container)
      .append("svg")
      .attr("preserveAspectRatio", "none");
    this.root = this.svg.append("g");

    // Custom wheel handler — replaces the uniform d3.zoom wheel behaviour
    // so we can support per-axis zoom when an axis is held.
    this.svg
      .node()
      ?.addEventListener("wheel", this.onSvgWheel, { passive: false });
    // Drag-to-pan on the plot area.
    this.svg.on("mousedown", (event: MouseEvent) => this.onSvgMouseDown(event));
    window.addEventListener("mousemove", this.onWindowMouseMove);
    window.addEventListener("mouseup", this.onWindowMouseUp);

    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(this.container);
  }

  private static readonly MARGIN = {
    top: 20,
    right: 20,
    bottom: 50,
    left: 70,
  } as const;

  setStars(stars: PlottedStar[]): void {
    this.stars = stars;
    this.render();
  }

  setAxes(axes: AxisConfig): void {
    this.axes = axes;
    this.render();
  }

  setSelected(id: string | null): void {
    this.selectedId = id;
    this.root
      .selectAll<SVGCircleElement, PlottedStar>("circle.point")
      .classed("selected", (d) => d.id === id);
  }

  setDotSize(size: number): void {
    this.dotSize = size;
    this.root
      .selectAll<SVGCircleElement, PlottedStar>("circle.point")
      .attr("r", size);
  }

  resetZoom(): void {
    this.xTransform = d3.zoomIdentity;
    this.yTransform = d3.zoomIdentity;
    this.render();
  }

  zoomIn(): void {
    this.scaleBoth(1.5);
  }

  zoomOut(): void {
    this.scaleBoth(1 / 1.5);
  }

  private scaleBoth(factor: number): void {
    const cx = this.innerW / 2;
    const cy = this.innerH / 2;
    this.xTransform = scaleAroundX(this.xTransform, cx, factor);
    this.yTransform = scaleAroundY(this.yTransform, cy, factor);
    this.render();
  }

  // Wheel handler (arrow function to keep `this` and a stable reference
  // for addEventListener / removeEventListener).
  private onSvgWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const node = this.svg.node();
    if (!node) return;
    const [mx, my] = d3.pointer(event, node);
    const margin = HRDiagram.MARGIN;
    const px = mx - margin.left;
    const py = my - margin.top;
    if (px < 0 && this.heldAxis !== "x") {
      // Wheel happened over the y-axis tick area: treat as a y-only zoom.
      this.heldAxis = "y";
    } else if (py > this.innerH && this.heldAxis !== "y") {
      // Wheel below the plot: treat as an x-only zoom (over x-axis).
      this.heldAxis = "x";
    }
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    if (this.heldAxis !== "y") {
      this.xTransform = scaleAroundX(this.xTransform, px, factor);
    }
    if (this.heldAxis !== "x") {
      this.yTransform = scaleAroundY(this.yTransform, py, factor);
    }
    this.render();
  };

  private onSvgMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    const node = this.svg.node();
    if (!node) return;
    const [mx, my] = d3.pointer(event, node);
    const margin = HRDiagram.MARGIN;
    const px = mx - margin.left;
    const py = my - margin.top;
    // Clicking the y-axis tick area (left of plot) → hold y axis.
    // Clicking the x-axis tick area (below plot) → hold x axis.
    // Otherwise initiate drag-to-pan.
    if (px < 0 && py >= 0 && py <= this.innerH) {
      this.heldAxis = "y";
      document.body.style.cursor = "ns-resize";
      event.preventDefault();
      return;
    }
    if (py > this.innerH && px >= 0 && px <= this.innerW) {
      this.heldAxis = "x";
      document.body.style.cursor = "ew-resize";
      event.preventDefault();
      return;
    }
    if (px >= 0 && px <= this.innerW && py >= 0 && py <= this.innerH) {
      this.dragStart = {
        px,
        py,
        xT: this.xTransform,
        yT: this.yTransform,
      };
      document.body.style.cursor = "grabbing";
      event.preventDefault();
    }
  }

  setOverlay(mode: "none" | "basic" | "advanced"): void {
    this.overlay = mode;
    this.render();
  }

  getOverlay(): "none" | "basic" | "advanced" {
    return this.overlay;
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.svg.node()?.removeEventListener("wheel", this.onSvgWheel);
    window.removeEventListener("mousemove", this.onWindowMouseMove);
    window.removeEventListener("mouseup", this.onWindowMouseUp);
    this.svg.remove();
  }

  private render(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = Math.max(300, rect.height);
    const margin = HRDiagram.MARGIN;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    this.innerW = innerW;
    this.innerH = innerH;

    this.svg.attr("viewBox", `0 0 ${width} ${height}`);
    this.root.attr("transform", `translate(${margin.left},${margin.top})`);

    const baseX = this.makeXScale(innerW);
    const baseY = this.makeYScale(innerH);
    // Per-axis transforms — zoom one axis without disturbing the other.
    const xScale = this.xTransform.rescaleX(baseX);
    const yScale = this.yTransform.rescaleY(baseY);
    const xValue = this.xValueFn();
    const yValue = this.yValueFn();

    this.root.selectAll("*").remove();

    // Clip path so panned/zoomed points don't escape the plot area.
    const defs = this.root.append("defs");
    defs
      .append("clipPath")
      .attr("id", this.clipId)
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerW)
      .attr("height", innerH);

    // Background rect captures zoom-drag gestures over empty plot area.
    this.root
      .append("rect")
      .attr("class", "plot-bg")
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("pointer-events", "all");

    // Gridlines.
    const gridG = this.root
      .append("g")
      .attr("class", "grid")
      .attr("clip-path", `url(#${this.clipId})`);

    gridG
      .selectAll("line.gridline-x")
      .data(xScale.ticks(8))
      .join("line")
      .attr("class", "gridline")
      .attr("x1", (d) => xScale(d as number))
      .attr("x2", (d) => xScale(d as number))
      .attr("y1", 0)
      .attr("y2", innerH);

    gridG
      .selectAll("line.gridline-y")
      .data(yScale.ticks(8))
      .join("line")
      .attr("class", "gridline")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => yScale(d as number))
      .attr("y2", (d) => yScale(d as number));

    // Axes.
    const xAxis = this.makeXAxis(xScale);
    const yAxis = this.makeYAxis(yScale);

    this.root
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis);

    this.root.append("g").attr("class", "axis y-axis").call(yAxis);

    // Axis labels.
    this.root
      .append("text")
      .attr("class", "axis-label")
      .attr("x", innerW / 2)
      .attr("y", innerH + 38)
      .attr("text-anchor", "middle")
      .text(this.xLabel());

    this.root
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", `translate(-50,${innerH / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .text(this.yLabel());

    // Region overlay (main sequence, red giants, white dwarfs, etc).
    // Drawn BEFORE points so dots stay on top, but AFTER axes so the
    // axis text never gets covered. Only renders in the canonical
    // luminosity-vs-temperature view, where (T, L) data coordinates
    // map cleanly to the regions.
    if (
      this.overlay !== "none" &&
      this.axes.yMode === "luminosity" &&
      this.axes.xMode === "temperature"
    ) {
      this.renderOverlay(xScale, yScale, innerW, innerH);
    }

    // Points — skip stars whose plotted coordinates aren't finite numbers.
    const plottable = this.stars.filter((d) => {
      const x = xValue(d);
      const y = yValue(d);
      return Number.isFinite(x) && Number.isFinite(y);
    });

    this.root
      .append("g")
      .attr("clip-path", `url(#${this.clipId})`)
      .selectAll<SVGCircleElement, PlottedStar>("circle.point")
      .data(plottable, (d) => d.id)
      .join("circle")
      .attr("class", "point")
      .classed("selected", (d) => d.id === this.selectedId)
      .attr("r", this.dotSize)
      .attr("cx", (d) => xScale(xValue(d)))
      .attr("cy", (d) => yScale(yValue(d)))
      .attr("fill", (d) => blackbodyColor(d.teff))
      .on("click", (_event, d) => this.onPointClick?.(d))
      .append("title")
      .text(
        (d) =>
          `${d.name}\nT_eff: ${d.teff.toFixed(0)} K\nL: ${d.luminositySolar.toExponential(2)} L☉\nM_V: ${d.absMag.toFixed(2)}`,
      );
  }

  // ---- region overlay ----

  // The main sequence centerline runs S-shaped through (T, L) — steep
  // at the hot end (O/B), gentle through F/G/K (the famous "kink"
  // around the Sun), then steeper again into the M dwarfs. Each tuple
  // is [T_eff (K), upper edge L_solar, lower edge L_solar].
  private static readonly MAIN_SEQUENCE: ReadonlyArray<readonly [number, number, number]> = [
    [40000, 6e5, 5e4],
    [25000, 5e4, 5e3],
    [15000, 4e3, 300],
    [10000, 200, 30],
    [8000, 30, 6],
    [6500, 5, 1.3],
    [5800, 1.7, 0.6],
    [5000, 0.6, 0.18],
    [4000, 0.15, 0.04],
    [3500, 0.04, 0.008],
    [3000, 0.008, 0.0012],
    [2400, 0.001, 0.00015],
  ];

  private static readonly REGIONS_BASIC: ReadonlyArray<RegionDef> = [
    {
      type: "band",
      name: "Main sequence",
      color: "#ffd97a",
      centerline: HRDiagram.MAIN_SEQUENCE,
      labelAt: [6800, 3.6],
      labelAngleDeg: -28,
    },
    {
      type: "blob",
      name: "Red giants",
      color: "#ff8b3a",
      centerT: 4200,
      centerL: 100,
      rDexT: 0.13,
      rDexL: 1.0,
      rotateDeg: 6,
    },
    {
      type: "blob",
      name: "White dwarfs",
      color: "#d6e5ff",
      centerT: 12000,
      centerL: 0.005,
      rDexT: 0.45,
      rDexL: 0.85,
      rotateDeg: -8,
    },
  ];
  private static readonly REGIONS_ADVANCED: ReadonlyArray<RegionDef> = [
    ...HRDiagram.REGIONS_BASIC,
    {
      type: "blob",
      name: "Blue supergiants",
      color: "#79c8ff",
      centerT: 18000,
      centerL: 1e5,
      rDexT: 0.27,
      rDexL: 0.65,
    },
    {
      type: "blob",
      name: "Red supergiants",
      color: "#ff5050",
      centerT: 3500,
      centerL: 1e5,
      rDexT: 0.18,
      rDexL: 0.7,
    },
    {
      type: "blob",
      name: "Red dwarfs",
      color: "#ff8585",
      centerT: 3100,
      centerL: 0.005,
      rDexT: 0.13,
      rDexL: 0.9,
      rotateDeg: 60,
    },
    {
      type: "blob",
      name: "Instability strip (variable stars)",
      color: "#c084ff",
      centerT: 6500,
      centerL: 200,
      rDexT: 0.1,
      rDexL: 1.4,
    },
    {
      type: "blob",
      name: "Subgiants",
      color: "#9be7c4",
      centerT: 5200,
      centerL: 8,
      rDexT: 0.1,
      rDexL: 0.55,
      rotateDeg: 5,
    },
  ];

  private renderOverlay(
    xScale: d3.ScaleContinuousNumeric<number, number>,
    yScale: d3.ScaleContinuousNumeric<number, number>,
    innerW: number,
    innerH: number,
  ): void {
    const regions =
      this.overlay === "advanced"
        ? HRDiagram.REGIONS_ADVANCED
        : HRDiagram.REGIONS_BASIC;
    const g = this.root
      .append("g")
      .attr("class", "overlay")
      .attr("clip-path", `url(#${this.clipId})`);
    // Per-region radial gradients give the soft fade-out at the edges
    // of each blob, so the overlay reads like a real H-R diagram
    // (Wikipedia / Britannica style) rather than a polygon outline.
    const defs = g.append("defs");
    for (const r of regions) {
      if (r.type !== "blob") continue;
      const id = `${this.clipId}-blob-${slug(r.name)}`;
      const grad = defs
        .append("radialGradient")
        .attr("id", id)
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "55%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", r.color).attr("stop-opacity", 0.55);
      grad.append("stop").attr("offset", "55%").attr("stop-color", r.color).attr("stop-opacity", 0.32);
      grad.append("stop").attr("offset", "100%").attr("stop-color", r.color).attr("stop-opacity", 0);
    }

    for (const r of regions) {
      if (r.type === "band") this.drawBand(g, r, xScale, yScale, innerW, innerH);
      else this.drawBlob(g, r, xScale, yScale, innerW, innerH);
    }
  }

  private drawBand(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    r: BandRegion,
    xScale: d3.ScaleContinuousNumeric<number, number>,
    yScale: d3.ScaleContinuousNumeric<number, number>,
    innerW: number,
    innerH: number,
  ): void {
    // Smooth area through the (T, L_top, L_bottom) control points using
    // Catmull-Rom interpolation. This gives the characteristic S-shape
    // of the main sequence — gentle through F/G/K, steeper at the
    // extremes — without any visible polygon facets.
    const area = d3
      .area<readonly [number, number, number]>()
      .x((d) => xScale(d[0]))
      .y0((d) => yScale(d[2]))
      .y1((d) => yScale(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.5));
    const pathD = area(r.centerline as Array<[number, number, number]>) ?? "";
    g.append("path")
      .attr("d", pathD)
      .attr("fill", r.color)
      .attr("fill-opacity", 0.22)
      .attr("stroke", r.color)
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 0.6);

    // Label along the band, lightly rotated to follow the curve.
    const [lT, lL] = r.labelAt;
    const lx = clampN(xScale(lT), 12, innerW - 12);
    const ly = clampN(yScale(lL), 14, innerH - 6);
    const t = g
      .append("text")
      .attr("x", lx)
      .attr("y", ly)
      .attr("text-anchor", "middle")
      .attr("fill", r.color)
      .attr("font-size", 11)
      .attr("font-style", "italic")
      .attr("paint-order", "stroke")
      .attr("stroke", "#0c1326")
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .text(r.name);
    if (r.labelAngleDeg) {
      t.attr("transform", `rotate(${r.labelAngleDeg} ${lx} ${ly})`);
    }
  }

  private drawBlob(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    r: BlobRegion,
    xScale: d3.ScaleContinuousNumeric<number, number>,
    yScale: d3.ScaleContinuousNumeric<number, number>,
    innerW: number,
    innerH: number,
  ): void {
    // Convert the dex half-widths into pixel half-widths via the scale.
    // The scale is log, so log10(T_center) ± rDexT translates to two T
    // values whose pixel positions give us the ellipse's pixel size.
    const cx = xScale(r.centerT);
    const cy = yScale(r.centerL);
    const t1 = Math.pow(10, Math.log10(r.centerT) + r.rDexT);
    const t2 = Math.pow(10, Math.log10(r.centerT) - r.rDexT);
    const l1 = Math.pow(10, Math.log10(r.centerL) + r.rDexL);
    const l2 = Math.pow(10, Math.log10(r.centerL) - r.rDexL);
    const rx = Math.abs(xScale(t1) - xScale(t2)) / 2;
    const ry = Math.abs(yScale(l1) - yScale(l2)) / 2;

    const id = `${this.clipId}-blob-${slug(r.name)}`;
    const ell = g
      .append("ellipse")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("rx", rx)
      .attr("ry", ry)
      .attr("fill", `url(#${id})`)
      .attr("stroke", "none");
    if (r.rotateDeg) {
      ell.attr("transform", `rotate(${r.rotateDeg} ${cx} ${cy})`);
    }

    const lx = clampN(cx, 12, innerW - 12);
    const ly = clampN(cy, 14, innerH - 6);
    g.append("text")
      .attr("x", lx)
      .attr("y", ly)
      .attr("text-anchor", "middle")
      .attr("fill", r.color)
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("paint-order", "stroke")
      .attr("stroke", "#0c1326")
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .text(r.name);
  }

  // ---- axis plumbing ----

  private xValueFn(): (d: PlottedStar) => number {
    if (this.axes.xMode === "temperature") return (d) => d.teff;
    // Colour mode: ordinal position derived from the star's temperature
    // across the 7 OBAFGKM bands; gives evenly-spaced colour labels.
    return (d) => tempToColourPos(d.teff);
  }

  private yValueFn(): (d: PlottedStar) => number {
    if (this.axes.yMode === "luminosity") return (d) => d.luminositySolar;
    return (d) => d.absMag;
  }

  // Fixed axis bounds. The user pans/zooms within these via d3-zoom; the
  // base domain stays constant so axes remain physically meaningful.
  private static readonly BOUNDS = {
    teff: [1500, 40000] as const,
    luminosity: [1e-4, 1e6] as const,
    absMag: [-12, 18] as const,
  };

  private makeXScale(innerW: number): d3.ScaleContinuousNumeric<number, number> {
    if (this.axes.xMode === "temperature") {
      const [lo, hi] = HRDiagram.BOUNDS.teff;
      const scale =
        this.axes.xScale === "log" ? d3.scaleLog() : d3.scaleLinear();
      return scale.domain([hi, lo]).range([0, innerW]);
    }
    // Colour mode: ordinal axis [0..1] = blue → red, mapped from T_eff
    // by tempToColourPos. Always linear (a "log" colour axis would be
    // meaningless).
    return d3.scaleLinear().domain([0, 1]).range([0, innerW]);
  }

  private makeYScale(innerH: number): d3.ScaleContinuousNumeric<number, number> {
    if (this.axes.yMode === "luminosity") {
      const [lo, hi] = HRDiagram.BOUNDS.luminosity;
      const scale =
        this.axes.yScale === "log" ? d3.scaleLog() : d3.scaleLinear();
      return scale.domain([lo, hi]).range([innerH, 0]);
    }
    const [lo, hi] = HRDiagram.BOUNDS.absMag;
    const scale =
      this.axes.yScale === "log" ? d3.scaleLog() : d3.scaleLinear();
    return scale.domain([hi, lo]).range([innerH, 0]);
  }

  private makeXAxis(scale: d3.ScaleContinuousNumeric<number, number>) {
    const axis = d3.axisBottom(scale);
    if (this.axes.xMode === "bv") {
      // Tick at the centre of each colour band, labelled by name.
      const N = COLOUR_BANDS.length;
      const tickValues = COLOUR_BANDS.map((_b, i) => (i + 0.5) / N);
      axis
        .tickValues(tickValues)
        .tickFormat((_v, i) => COLOUR_BANDS[i]?.label ?? "");
      return axis;
    }
    if (this.axes.xMode === "temperature" && this.axes.xScale === "log") {
      axis.ticks(6, "~s");
    } else {
      axis.ticks(8);
    }
    return axis;
  }

  private makeYAxis(scale: d3.ScaleContinuousNumeric<number, number>) {
    const axis = d3.axisLeft(scale);
    if (this.axes.yMode === "luminosity") {
      const fmt = this.axes.yLabelFormat ?? "decimals";
      const unit = this.axes.yUnit ?? "solar";
      axis.ticks(6).tickFormat((v) => formatLuminosityTick(v as number, fmt, unit));
    } else {
      axis.ticks(8);
    }
    return axis;
  }

  private xLabel(): string {
    if (this.axes.xMode === "temperature") {
      return "Surface temperature (K) — hotter ←";
    }
    return "Colour";
  }

  private yLabel(): string {
    if (this.axes.yMode === "luminosity") {
      return this.axes.yUnit === "watts"
        ? "Power output (watts)"
        : "Brightness compared to the Sun";
    }
    return "Absolute magnitude — brighter ↑";
  }
}

// L_☉ = 3.828 × 10²⁶ W (IAU 2015 nominal solar luminosity).
const L_SUN_W = 3.828e26;

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "-": "⁻", "+": "⁺",
};
function toSuperscript(n: number): string {
  return String(n)
    .split("")
    .map((ch) => SUPERSCRIPTS[ch] ?? ch)
    .join("");
}

// Round display to 3 sig figs, dropping trailing zeros.
function trimSig(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const s = n.toPrecision(3);
  // Strip trailing zeros after a decimal, and the decimal itself if bare.
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

export function formatLuminosityTick(
  solarValue: number,
  format: "decimals" | "fractions" | "powers",
  unit: "solar" | "watts",
): string {
  if (!Number.isFinite(solarValue) || solarValue <= 0) return "";
  const value = unit === "watts" ? solarValue * L_SUN_W : solarValue;
  // Skip non-decade ticks (within ~5%) when in powers/fractions mode so
  // we don't get clutter — d3 sometimes adds intermediate ticks like 2,
  // 5 which look messy with these label styles.
  const log = Math.log10(value);
  const isDecade = Math.abs(log - Math.round(log)) < 0.02;

  if (format === "powers") {
    if (!isDecade) return "";
    const e = Math.round(log);
    return `10${toSuperscript(e)}${unit === "watts" ? " W" : ""}`;
  }
  if (format === "fractions" && unit === "solar") {
    if (!isDecade) return "";
    const e = Math.round(log);
    if (e === 0) return "1";
    if (e > 0) return `${10 ** e}`;
    return `1/${10 ** -e}`;
  }
  // Decimals (default), and the watts fallback when fractions is picked.
  if (unit === "watts") {
    // Always scientific for watts since values are huge.
    if (!isDecade) return "";
    const e = Math.round(log);
    return `10${toSuperscript(e)} W`;
  }
  return trimSig(value);
}

// Build a new ZoomTransform that scales `transform` around horizontal
// pixel `pivot` by `factor` (>1 zooms in). Keeps the data value at
// `pivot` fixed in display coordinates.
function scaleAroundX(
  transform: d3.ZoomTransform,
  pivot: number,
  factor: number,
): d3.ZoomTransform {
  const newK = clampK(transform.k * factor);
  // d3 ZoomTransform.applyX(plotX) = k * plotX + tx. Holding pivot fixed
  // for the new transform: newK * plotX_at_pivot + newX = pivot, so
  // newX = pivot - effectiveFactor * (pivot - transform.x).
  const effective = newK / transform.k;
  const newX = pivot - effective * (pivot - transform.x);
  return d3.zoomIdentity.translate(newX, 0).scale(newK);
}
function scaleAroundY(
  transform: d3.ZoomTransform,
  pivot: number,
  factor: number,
): d3.ZoomTransform {
  const newK = clampK(transform.k * factor);
  const effective = newK / transform.k;
  const newY = pivot - effective * (pivot - transform.y);
  return d3.zoomIdentity.translate(0, newY).scale(newK);
}
function clampK(k: number): number {
  return Math.max(0.5, Math.min(100, k));
}

function clampN(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
