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
  getRaDec: () => [number, number];
  getFov: () => [number, number];
  addCatalog: (cat: AladinCatalog) => void;
  on: (
    event: string,
    handler: (...args: unknown[]) => void,
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

export interface CandidateStar extends Star {
  // tag preserved on the marker so the sky-viewer click handler can hand
  // it back to the app without a separate lookup.
}

export interface SkyViewerOptions {
  container: HTMLElement;
  initialTarget?: string;
  initialSurvey?: string;
  initialFov?: number;
  onSampleClick?: (star: Star) => void;
  onCandidateClick?: (star: CandidateStar) => void;
  onStatus?: (msg: string) => void;
}

export class SkyViewer {
  private aladin?: AladinInstance;
  private sampleCatalog?: AladinCatalog;
  private candidateCatalog?: AladinCatalog;
  private samplesById = new Map<string, Star>();
  private candidatesById = new Map<string, CandidateStar>();
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
      name: "Reference stars",
      sourceSize: 14,
      color: "#ffd166",
      shape: "circle",
    });
    this.candidateCatalog = A.catalog({
      name: "Search results",
      sourceSize: 10,
      color: "#6cc4ff",
      shape: "plus",
    });
    this.aladin.addCatalog(this.sampleCatalog);
    this.aladin.addCatalog(this.candidateCatalog);

    this.aladin.on("objectClicked", (...args: unknown[]) => {
      const obj = args[0] as AladinSource | null;
      if (!obj) return;
      const id = obj.data?.id;
      if (typeof id !== "string") return;
      const candidate = this.candidatesById.get(id);
      if (candidate) {
        this.opts.onCandidateClick?.(candidate);
        return;
      }
      const sample = this.samplesById.get(id);
      if (sample) this.opts.onSampleClick?.(sample);
    });

    this.opts.onStatus?.("Ready. Pan + zoom to find a region, then Search.");
  }

  async getCenter(): Promise<[number, number] | null> {
    await this.ready;
    return this.aladin?.getRaDec() ?? null;
  }

  async getFov(): Promise<[number, number] | null> {
    await this.ready;
    return this.aladin?.getFov() ?? null;
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

  async setCandidates(candidates: CandidateStar[]): Promise<void> {
    await this.ready;
    if (!this.candidateCatalog || !window.A) return;
    this.candidatesById.clear();
    const sources = candidates.map((s) => {
      this.candidatesById.set(s.id, s);
      return window.A!.source(s.ra, s.dec, {
        id: s.id,
        name: s.name,
      });
    });
    this.candidateCatalog.removeAll();
    if (sources.length > 0) this.candidateCatalog.addSources(sources);
  }

  removeCandidate(id: string): void {
    this.candidatesById.delete(id);
    // Aladin's catalog doesn't expose a "remove one source" call in v3,
    // so we rebuild the catalog from the remaining candidates.
    void this.setCandidates(Array.from(this.candidatesById.values()));
  }

  clearCandidates(): void {
    this.candidatesById.clear();
    this.candidateCatalog?.removeAll();
  }

  getCandidates(): CandidateStar[] {
    return Array.from(this.candidatesById.values());
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
