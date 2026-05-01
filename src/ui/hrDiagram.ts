import * as d3 from "d3";
import type { AxisConfig, PlottedStar } from "../types";
import { bvFromTemp } from "../data/derive";

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

    // points
    this.root
      .append("g")
      .selectAll<SVGCircleElement, PlottedStar>("circle.point")
      .data(this.stars, (d) => d.id)
      .join("circle")
      .attr("class", "point")
      .classed("selected", (d) => d.id === this.selectedId)
      .attr("r", 5)
      .attr("cx", (d) => xScale(xValue(d)))
      .attr("cy", (d) => yScale(yValue(d)))
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

  private makeXScale(innerW: number): d3.ScaleContinuousNumeric<number, number> {
    const values = this.stars.map(this.xValueFn());
    if (this.axes.xMode === "temperature") {
      const [min, max] = niceRange(values, 2500, 40000);
      const scale =
        this.axes.xScale === "log" ? d3.scaleLog() : d3.scaleLinear();
      // Hot stars on the LEFT — invert range.
      return scale.domain([max, min]).range([0, innerW]);
    }
    const [min, max] = niceRange(values, -0.5, 2.5);
    const scale =
      this.axes.xScale === "log" ? d3.scaleLog() : d3.scaleLinear();
    return scale.domain([min, max]).range([0, innerW]);
  }

  private makeYScale(innerH: number): d3.ScaleContinuousNumeric<number, number> {
    const values = this.stars.map(this.yValueFn());
    if (this.axes.yMode === "luminosity") {
      const [min, max] = niceRange(values, 1e-4, 1e6);
      const scale =
        this.axes.yScale === "log" ? d3.scaleLog() : d3.scaleLinear();
      // Luminous stars on TOP — domain low->high, range bottom->top.
      return scale.domain([min, max]).range([innerH, 0]);
    }
    const [min, max] = niceRange(values, -10, 16);
    const scale =
      this.axes.yScale === "log" ? d3.scaleLog() : d3.scaleLinear();
    // Brighter (more negative magnitude) on TOP — invert.
    return scale.domain([max, min]).range([innerH, 0]);
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
      return `Effective temperature T_eff (K)${this.axes.xScale === "log" ? ", log" : ""} — hotter ←`;
    }
    return `B − V color index${this.axes.xScale === "log" ? ", log" : ""}`;
  }

  private yLabel(): string {
    if (this.axes.yMode === "luminosity") {
      return `Luminosity L / L⊙${this.axes.yScale === "log" ? ", log" : ""}`;
    }
    return `Absolute magnitude M_V${this.axes.yScale === "log" ? ", log" : ""}`;
  }
}

function niceRange(
  values: number[],
  fallbackMin: number,
  fallbackMax: number,
): [number, number] {
  if (values.length === 0) return [fallbackMin, fallbackMax];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.1;
  return [min - pad, max + pad];
}
