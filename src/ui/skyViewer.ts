import type { Star } from "../types";
import type { MarkerShape, StarSet } from "../data/sampleStars";

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
  show: () => void;
  hide: () => void;
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

export interface CandidateStar extends Star {}

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
  private setCatalogs = new Map<string, AladinCatalog>();
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
        "Sky viewer failed to load. Check your internet connection.",
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
      showFrame: false,
      showProjectionControl: false,
    });

    this.candidateCatalog = A.catalog({
      name: "Search results",
      sourceSize: 10,
      color: "#6cc4ff",
      shape: "plus",
    });
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

    // Notify the host whenever Aladin's full-screen mode changes so the
    // surrounding UI can collapse / restore. Aladin Lite v3 uses a CSS
    // fallback in some environments (e.g. iframes without an explicit
    // `allow="fullscreen"`), where the native `fullscreenchange` event
    // never fires. Subscribe to Aladin's own event AND the native one
    // so either path triggers the body class.
    const setFullscreen = (on: boolean) => {
      document.body.classList.toggle("aladin-fullscreen", on);
    };
    this.aladin.on("fullScreenToggled", (...args: unknown[]) => {
      setFullscreen(Boolean(args[0]));
    });
    document.addEventListener("fullscreenchange", () => {
      const fs = document.fullscreenElement;
      const inAladin =
        !!fs &&
        (fs === this.opts.container || this.opts.container.contains(fs));
      setFullscreen(inAladin);
    });

    this.opts.onStatus?.(
      "Drag to move, scroll to zoom. Then press Search to find stars.",
    );
  }

  registerSets(sets: StarSet[]): Promise<void> {
    return this.ready.then(() => {
      if (!this.aladin || !window.A) return;
      for (const set of sets) {
        if (this.setCatalogs.has(set.id)) continue;
        const cat = window.A.catalog({
          name: set.label,
          sourceSize: 14,
          color: set.markerColor,
          shape: set.markerShape as MarkerShape,
        });
        this.aladin.addCatalog(cat);
        this.setCatalogs.set(set.id, cat);

        // Pre-populate marker sources for the set.
        const sources: AladinSource[] = [];
        for (const s of set.stars) {
          this.samplesById.set(s.id, s);
          sources.push(
            window.A.source(s.ra, s.dec, {
              id: s.id,
              name: s.name,
              spectralType: s.spectralType ?? "",
            }),
          );
        }
        if (sources.length > 0) cat.addSources(sources);
      }
    });
  }

  setSetVisibility(setId: string, visible: boolean): void {
    const cat = this.setCatalogs.get(setId);
    if (!cat) return;
    if (visible) cat.show();
    else cat.hide();
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
    void this.setCandidates(Array.from(this.candidatesById.values()));
  }

  clearCandidates(): void {
    this.candidatesById.clear();
    this.candidateCatalog?.removeAll();
  }

  getCandidates(): CandidateStar[] {
    return Array.from(this.candidatesById.values());
  }

  async getCenter(): Promise<[number, number] | null> {
    await this.ready;
    return this.aladin?.getRaDec() ?? null;
  }

  async getFov(): Promise<[number, number] | null> {
    await this.ready;
    return this.aladin?.getFov() ?? null;
  }

  async goto(target: string): Promise<void> {
    await this.ready;
    if (!this.aladin) return;
    return new Promise((resolve) => {
      this.aladin!.gotoObject(target, {
        success: () => {
          this.opts.onStatus?.(`Centred on ${target}.`);
          resolve();
        },
        error: () => {
          this.opts.onStatus?.(`Could not find "${target}".`);
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
