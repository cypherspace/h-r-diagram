export interface Star {
  id: string;
  name: string;
  ra: number;
  dec: number;
  mV: number;
  distancePc: number;
  teff: number;
  bv?: number;
  spectralType?: string;
  notes?: string;
  // Page slug on en.wikipedia.org. Set for named/curated stars; left
  // undefined for Gaia-discovered stars where there's no obvious page.
  wikipedia?: string;
}

export interface PlottedStar extends Star {
  absMag: number;
  luminositySolar: number;
}

export type YAxisMode = "luminosity" | "absoluteMagnitude";
export type XAxisMode = "temperature" | "bv";
export type ScaleMode = "log" | "linear";

export interface AxisConfig {
  yMode: YAxisMode;
  xMode: XAxisMode;
  yScale: ScaleMode;
  xScale: ScaleMode;
}

export interface SavedDiagram {
  name: string;
  savedAt: number;
  stars: Star[];
  axes: AxisConfig;
}
