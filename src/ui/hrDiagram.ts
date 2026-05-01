import * as d3 from "d3";
import type { AxisConfig, PlottedStar } from "../types";
import { blackbodyColor, bvFromTemp } from "../data/derive";

export interface HRDiagramOptions {
  container: HTMLElement;
  axes: AxisConfig;
  onPointClick?: (star: PlottedStar) => void;
}

export class HRDiagram {
  private container: HTMLElement;
  private axes: AxisConfig;
  private onPointClick?: (star: PlottedStar) => void;
  private stars: PlottedStar[] = [];
  private selectedId: string | null = null;
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private root!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private resizeObserver: ResizeObserver;

  constructor(opts: HRDiagramOptions) {
    this.container = opts.container;
    this.axes = opts.axes;
    this.onPointClick = opts.onPointClick;

    this.svg = d3
      .select(this.container)
      .append("svg")
      .attr("preserveAspectRatio", "none");
    this.root = this.svg.append("g");

    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(this.container);
  }

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

  destroy(): void {
    this.resizeObserver.disconnect();
    this.svg.remove();
  }

  private render(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = Math.max(300, rect.height);
    const margin = { top: 20, right: 20, bottom: 50, left: 70 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    this.svg.attr("viewBox", `0 0 ${width} ${height}`);
    this.root.attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = this.makeXScale(innerW);
    const yScale = this.makeYScale(innerH);
    const xValue = this.xValueFn();
    const yValue = this.yValueFn();

    this.root.selectAll("*").remove();

    // gridlines
    this.root
      .append("g")
      .attr("class", "grid")
      .selectAll("line.gridline-x")
      .data(xScale.ticks(8))
      .join("line")
      .attr("class", "gridline")
      .attr("x1", (d) => xScale(d as number))
      .attr("x2", (d) => xScale(d as number))
      .attr("y1", 0)
      .attr("y2", innerH);

    this.root
      .append("g")
      .selectAll("line.gridline-y")
      .data(yScale.ticks(8))
      .join("line")
      .attr("class", "gridline")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => yScale(d as number))
      .attr("y2", (d) => yScale(d as number));

    // axes
    const xAxis = this.makeXAxis(xScale);
    const yAxis = this.makeYAxis(yScale);

    this.root
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis);

    this.root.append("g").attr("class", "axis y-axis").call(yAxis);

    // axis labels
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

    // points — skip stars whose plotted coordinates aren't finite numbers
    // (e.g. NaN luminosity from a corrupt input). d3 scales handle
    // out-of-range values via .clamp(true), but NaN still propagates.
    const plottable = this.stars.filter((d) => {
      const x = xValue(d);
      const y = yValue(d);
      return Number.isFinite(x) && Number.isFinite(y);
    });

    this.root
      .append("g")
      .selectAll<SVGCircleElement, PlottedStar>("circle.point")
      .data(plottable, (d) => d.id)
      .join("circle")
      .attr("class", "point")
      .classed("selected", (d) => d.id === this.selectedId)
      .attr("r", 5)
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

  // ---- axis plumbing ----

  private xValueFn(): (d: PlottedStar) => number {
    if (this.axes.xMode === "temperature") return (d) => d.teff;
    return (d) => d.bv ?? bvFromTemp(d.teff);
  }

  private yValueFn(): (d: PlottedStar) => number {
    if (this.axes.yMode === "luminosity") return (d) => d.luminositySolar;
    return (d) => d.absMag;
  }

  // Fixed axis bounds. Real H-R diagrams span ~10 decades in luminosity
  // and ~1 decade in temperature; pinning the domain keeps the axes
  // legible regardless of which stars are loaded and avoids breakage from
  // outlier Gaia rows with tiny parallaxes (huge derived luminosities).
  private static readonly BOUNDS = {
    teff: [1500, 40000] as const,        // hot ↑ (left in plot)
    bv: [-0.5, 2.5] as const,            // bluer ↑ (left in plot)
    luminosity: [1e-4, 1e6] as const,    // L / L☉ (log)
    absMag: [-12, 18] as const,          // M_V; brighter (more negative) ↑
  };

  private makeXScale(innerW: number): d3.ScaleContinuousNumeric<number, number> {
    if (this.axes.xMode === "temperature") {
      const [lo, hi] = HRDiagram.BOUNDS.teff;
      const scale =
        this.axes.xScale === "log" ? d3.scaleLog() : d3.scaleLinear();
      return scale.domain([hi, lo]).range([0, innerW]).clamp(true);
    }
    const [lo, hi] = HRDiagram.BOUNDS.bv;
    const scale =
      this.axes.xScale === "log" ? d3.scaleLog() : d3.scaleLinear();
    return scale.domain([lo, hi]).range([0, innerW]).clamp(true);
  }

  private makeYScale(innerH: number): d3.ScaleContinuousNumeric<number, number> {
    if (this.axes.yMode === "luminosity") {
      const [lo, hi] = HRDiagram.BOUNDS.luminosity;
      const scale =
        this.axes.yScale === "log" ? d3.scaleLog() : d3.scaleLinear();
      return scale.domain([lo, hi]).range([innerH, 0]).clamp(true);
    }
    const [lo, hi] = HRDiagram.BOUNDS.absMag;
    const scale =
      this.axes.yScale === "log" ? d3.scaleLog() : d3.scaleLinear();
    return scale.domain([hi, lo]).range([innerH, 0]).clamp(true);
  }

  private makeXAxis(scale: d3.ScaleContinuousNumeric<number, number>) {
    const axis = d3.axisBottom(scale);
    if (this.axes.xMode === "temperature" && this.axes.xScale === "log") {
      axis.ticks(6, "~s");
    } else {
      axis.ticks(8);
    }
    return axis;
  }

  private makeYAxis(scale: d3.ScaleContinuousNumeric<number, number>) {
    const axis = d3.axisLeft(scale);
    if (this.axes.yMode === "luminosity" && this.axes.yScale === "log") {
      axis.ticks(6, "~s");
    } else {
      axis.ticks(8);
    }
    return axis;
  }

  private xLabel(): string {
    if (this.axes.xMode === "temperature") {
      return "Surface temperature (K) — hotter ←";
    }
    return "Colour (blue ← → red)";
  }

  private yLabel(): string {
    if (this.axes.yMode === "luminosity") {
      return "Brightness compared to the Sun";
    }
    return "Absolute magnitude — brighter ↑";
  }
}

