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

export class HRDiagram {
  private container: HTMLElement;
  private axes: AxisConfig;
  private onPointClick?: (star: PlottedStar) => void;
  private stars: PlottedStar[] = [];
  private selectedId: string | null = null;
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private root!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private resizeObserver: ResizeObserver;
  private zoomBehaviour: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private currentTransform: d3.ZoomTransform = d3.zoomIdentity;
  private dotSize: number;
  private clipId: string;

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

    this.zoomBehaviour = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 100])
      .filter((event) => {
        // Allow wheel + drag, but ignore right-click drags so the user can
        // still right-click to copy / inspect.
        if (event.type === "mousedown" && event.button !== 0) return false;
        return true;
      })
      .on("zoom", (event) => {
        this.currentTransform = event.transform;
        this.render();
      });
    this.svg.call(this.zoomBehaviour);

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

  setDotSize(size: number): void {
    this.dotSize = size;
    this.root
      .selectAll<SVGCircleElement, PlottedStar>("circle.point")
      .attr("r", size);
  }

  resetZoom(): void {
    this.svg
      .transition()
      .duration(300)
      .call(this.zoomBehaviour.transform, d3.zoomIdentity);
  }

  zoomIn(): void {
    this.svg
      .transition()
      .duration(200)
      .call(this.zoomBehaviour.scaleBy, 1.5);
  }

  zoomOut(): void {
    this.svg
      .transition()
      .duration(200)
      .call(this.zoomBehaviour.scaleBy, 1 / 1.5);
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

    const baseX = this.makeXScale(innerW);
    const baseY = this.makeYScale(innerH);
    // d3-zoom rescaleX/Y works on linear, log, and pow scales.
    const xScale = this.currentTransform.rescaleX(baseX);
    const yScale = this.currentTransform.rescaleY(baseY);
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
    return "Colour";
  }

  private yLabel(): string {
    if (this.axes.yMode === "luminosity") {
      return "Brightness compared to the Sun";
    }
    return "Absolute magnitude — brighter ↑";
  }
}
