import type { Star } from "../types";

declare global {
  interface Window {
    A?: AladinNamespace;
  }
}

interface AladinSource {
  data: Record<string, unknown>;
  ra?: number;
  dec?: number;
}

interface AladinCatalog {
  addSources: (sources: AladinSource[]) => void;
  removeAll: () => void;
}

interface AladinInstance {
  setImageSurvey: (survey: string) => void;
  gotoObject: (
    name: string,
    options?: {
      success?: () => void;
      error?: (err: unknown) => void;
    },
  ) => void;
  gotoRaDec: (ra: number, dec: number) => void;
  addCatalog: (cat: AladinCatalog) => void;
  on: (
    event: "objectClicked" | "objectHovered",
    handler: (obj: AladinSource | null) => void,
  ) => void;
}

interface AladinNamespace {
  init: Promise<void>;
  aladin: (
    selector: string | HTMLElement,
    opts: Record<string, unknown>,
  ) => AladinInstance;
  catalog: (opts: Record<string, unknown>) => AladinCatalog;
  source: (
    ra: number,
    dec: number,
    data: Record<string, unknown>,
  ) => AladinSource;
}

export interface SkyViewerOptions {
  container: HTMLElement;
  initialTarget?: string;
  initialSurvey?: string;
  initialFov?: number;
  onStarClick?: (star: Star) => void;
  onStatus?: (msg: string) => void;
}

export class SkyViewer {
  private aladin?: AladinInstance;
  private sampleCatalog?: AladinCatalog;
  private samplesById = new Map<string, Star>();
  private opts: SkyViewerOptions;
  private ready: Promise<void>;

  constructor(opts: SkyViewerOptions) {
    this.opts = opts;
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    const A = await waitForAladin();
    if (!A) {
      this.opts.onStatus?.(
        "Sky viewer failed to load (Aladin Lite CDN unreachable).",
      );
      return;
    }
    await A.init;
    this.aladin = A.aladin(this.opts.container, {
      survey: this.opts.initialSurvey ?? "P/DSS2/color",
      fov: this.opts.initialFov ?? 60,
      target: this.opts.initialTarget ?? "Pleiades",
      cooFrame: "ICRSd",
      showReticle: true,
      showZoomControl: true,
      showFullscreenControl: true,
      showLayersControl: false,
      showGotoControl: false,
      showShareControl: false,
      showCooGrid: false,
    });

    this.sampleCatalog = A.catalog({
      name: "Sample stars",
      sourceSize: 14,
      color: "#ffd166",
      shape: "circle",
    });
    this.aladin.addCatalog(this.sampleCatalog);

    this.aladin.on("objectClicked", (obj) => {
      if (!obj) return;
      const id = obj.data?.id;
      if (typeof id === "string") {
        const star = this.samplesById.get(id);
        if (star) this.opts.onStarClick?.(star);
      }
    });

    this.opts.onStatus?.("Ready. Drag to pan, scroll to zoom.");
  }

  async setSampleStars(stars: Star[]): Promise<void> {
    await this.ready;
    if (!this.sampleCatalog || !window.A) return;
    this.samplesById.clear();
    const sources = stars.map((s) => {
      this.samplesById.set(s.id, s);
      return window.A!.source(s.ra, s.dec, {
        id: s.id,
        name: s.name,
        spectralType: s.spectralType ?? "",
      });
    });
    this.sampleCatalog.removeAll();
    this.sampleCatalog.addSources(sources);
  }

  async goto(target: string): Promise<void> {
    await this.ready;
    if (!this.aladin) return;
    return new Promise((resolve) => {
      this.aladin!.gotoObject(target, {
        success: () => {
          this.opts.onStatus?.(`Centered on ${target}.`);
          resolve();
        },
        error: () => {
          this.opts.onStatus?.(`Could not resolve "${target}".`);
          resolve();
        },
      });
    });
  }

  async gotoRaDec(ra: number, dec: number): Promise<void> {
    await this.ready;
    this.aladin?.gotoRaDec(ra, dec);
  }

  async setSurvey(survey: string): Promise<void> {
    await this.ready;
    this.aladin?.setImageSurvey(survey);
  }
}

async function waitForAladin(timeoutMs = 8000): Promise<AladinNamespace | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.A) return window.A;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}
