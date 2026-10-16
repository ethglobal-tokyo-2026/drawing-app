import {
  destroyRenderer,
  sharedRenderer,
  type FoilResources,
  type StickerRenderer,
} from "./stickerRendererGpu";
import { holdFoilCoverageMask } from "./acquireFoilCoverage";
import { type FoilCoverage } from "./foilCoverage";
import type { StickerFoilMaterial } from "./stickerFoilMaterial";
export type { StickerFoilMaterial } from "./stickerFoilMaterial";
import type { LaminateFinish } from "./laminate";
import { notePerformance } from "../performance/performanceRecorder";
import { releaseCanvas } from "../ui/releaseCanvas";

/** The same short set-down timing as a board sticker's press. */
const CREASE_REVEAL_MS = 220;

export interface StickerSurface {
  print: string;
  cut: string;
  normal?: string;
  /** The crease's steps' height, registered with its normal; it loads and commits with the normal. */
  height?: string;
  turn: number;
  finish: LaminateFinish;
  foil?: StickerFoilMaterial;
  /** Normal texture bounds in source UV coordinates; required for creased overflow. */
  normalBounds?: { x: number; y: number; width: number; height: number };
  paperAmount?: number;
  foilAmount?: number;
  tiltX?: number;
  tiltY?: number;
  /** Covered Sticker Boards and clipped tray faces pause snapshots until exposed again. */
  active?: () => boolean;
  /** The matching painted crease advances only after its laminate snapshot is ready. */
  onCreaseProgress?: (normal: string, progress: number) => void;
  /** A placement permits preparing this normal's finite reveal without consuming it. */
  canRevealCrease?: (normal: string) => boolean;
  /** The first successful retained snapshot consumes this placement's reveal once. */
  startCreaseReveal?: (normal: string) => boolean;
}

/** Cached alpha and material captured with one committed complete material. */
export interface StickerFoilCoverage {
  readonly cut: string;
  readonly material: Readonly<StickerFoilMaterial>;
  readonly frame: Readonly<{ width: number; height: number }>;
  readonly coverage: Readonly<Omit<FoilCoverage, "alpha">> & {
    readonly alpha: Readonly<{ length: number; at: (index: number) => number | undefined }>;
    /** The static band's mask: the baked mask, or the grown band its coverage worker encoded. */
    readonly mask: string;
  };
}

const materialIdentity = (options: Pick<StickerSurface, "foil" | "finish" | "normalBounds">) =>
  JSON.stringify([options.finish, options.foil, options.normalBounds]);

const mounted = new WeakMap<HTMLCanvasElement, MountedSurface>();
export class MountedSurface {
  gpu: StickerRenderer | null = null;
  textures: WebGLTexture[] | null = null;
  hasSnapshot = false;
  seededCopy = false;
  snapshotNormal?: string;
  snapshotMaterial?: string;
  snapshotNormalBounds?: StickerSurface["normalBounds"];
  normalBounds?: StickerSurface["normalBounds"];
  readonly copies = new Set<() => void>();
  readonly foilCommits = new Set<(coverage: StickerFoilCoverage | undefined) => void>();
  coverageSize = "";
  snapshotOptions?: StickerSurface;
  snapshotCoverageFrame?: { width: number; height: number };
  snapshotFoilCoverage?: StickerFoilCoverage;
  /** The shown snapshot keeps its mask loadable for copies until other pixels replace it. */
  releaseSnapshotMask = () => {};
  coverageFrame?: { width: number; height: number };
  snapshotPending = false;
  renderFailed = false;
  initializationAttempted = false;
  materialUpdating = false;
  readonly waiters = new Set<{
    expected?: { normal?: string };
    finish: () => void;
  }>();
  printCut: {
    print: string;
    cut: string;
    textures: [WebGLTexture, WebGLTexture];
    foil?: FoilResources;
    foilKey?: string;
    identity: string;
    finish: LaminateFinish;
  } | null = null;
  pendingPrintCut: {
    print: string;
    cut: string;
    gpu: StickerRenderer;
    foilKey?: string;
    identity: string;
    commit?: () => void;
    reject: (error: unknown) => void;
  } | null = null;
  printCutError: string | null = null;
  normalError: string | null = null;
  /** The committed material went without foil because its coverage failed. */
  foilError: string | null = null;
  normalFailure: { url: string } | null = null;
  normalUrl?: string;
  normalTexture: WebGLTexture | null = null;
  heightUrl?: string;
  heightTexture: WebGLTexture | null = null;
  pendingNormal: {
    url?: string;
    height?: string;
    material?: NonNullable<MountedSurface["pendingPrintCut"]>;
    gpu: StickerRenderer;
    bounds?: StickerSurface["normalBounds"];
    commit?: () => void;
  } | null = null;
  reveal: {
    normal: string;
    admitted: boolean;
    started: number | null;
    progress: number;
  } | null = null;
  completedNormal?: string;
  flat: HTMLCanvasElement | null = null;
  flatFrame: HTMLSpanElement | null = null;
  live = true;
  readonly canvas: HTMLCanvasElement;
  readonly container: HTMLElement;
  readonly options: StickerSurface;
  constructor(
    canvas: HTMLCanvasElement,
    options: StickerSurface,
    coverageFrame?: { width: number; height: number },
  ) {
    this.coverageFrame = coverageFrame;
    this.canvas = canvas;
    const container = canvas.closest(".sticker-material-surface");
    this.container = container instanceof HTMLElement ? container : canvas;
    this.options = options;
    this.reload();
  }
  reload() {
    if (!this.live) return;
    this.textures = null;
    this.hasSnapshot = false;
    this.showFoilCoverage(undefined);
    this.seededCopy = false;
    this.snapshotNormal = undefined;
    this.snapshotMaterial = undefined;
    this.snapshotPending = false;
    this.renderFailed = false;
    this.initializationAttempted = false;
    this.gpu = null;
    this.printCut = null;
    this.pendingPrintCut = null;
    this.printCutError = this.normalError = this.foilError = null;
    this.normalFailure = null;
    delete this.canvas.dataset.error;
    this.normalUrl = undefined;
    this.normalBounds = undefined;
    this.normalTexture = null;
    this.heightUrl = undefined;
    this.heightTexture = null;
    this.pendingNormal = null;
    this.initialize();
  }
  /** What sizeOutput last wrote, so an unchanged output writes no styles. */
  readonly outputs = new WeakMap<
    HTMLCanvasElement,
    { coverage: Omit<FoilCoverage, "alpha"> | undefined; wrapped: boolean }
  >();
  writtenOrigin: { coverage: object | undefined; width: number; height: number } | null = null;
  /** The container's size as this frame's draw measured it. */
  measured: { width: number; height: number } | null = null;
  showFoilCoverage(coverage: StickerFoilCoverage | undefined) {
    if (coverage === this.snapshotFoilCoverage) return;
    const release = this.releaseSnapshotMask;
    this.releaseSnapshotMask = coverage ? holdFoilCoverageMask(coverage.coverage.mask) : () => {};
    this.snapshotFoilCoverage = coverage;
    release();
  }
  sizeOutput(
    canvas: HTMLCanvasElement,
    coverage: Omit<FoilCoverage, "alpha"> | undefined = this.printCut?.foil?.coverage,
  ) {
    // Standalone canvases inside a source frame have no reveal wrappers.
    const wrapped =
      this.container !== this.canvas &&
      canvas.parentElement?.classList.contains("crease-reveal-content") === true;
    const written = this.outputs.get(canvas);
    const canvasCurrent =
      written !== undefined && written.coverage === coverage && written.wrapped === wrapped;
    if (this.container === this.canvas) {
      if (canvasCurrent) return;
      this.outputs.set(canvas, { coverage, wrapped });
      // Keep the CSS source box responsive; presentation overflow must not resize its input box.
      canvas.style.transformOrigin = "0 0";
      canvas.style.scale = coverage
        ? `${coverage.width / coverage.sourceWidth} ${coverage.height / coverage.sourceHeight}`
        : "1";
      canvas.style.translate = coverage
        ? `${(100 * coverage.x) / coverage.sourceWidth}% ${(100 * coverage.y) / coverage.sourceHeight}%`
        : "0 0";
      return;
    }
    const width = this.measured?.width ?? this.container.clientWidth,
      height = this.measured?.height ?? this.container.clientHeight;
    const origin = this.writtenOrigin;
    if (
      !origin ||
      origin.coverage !== coverage ||
      origin.width !== width ||
      origin.height !== height
    ) {
      this.writtenOrigin = { coverage, width, height };
      this.container.style.setProperty(
        "--crease-origin-x",
        `${coverage ? (width * coverage.x) / coverage.sourceWidth : 0}px`,
      );
      this.container.style.setProperty(
        "--crease-origin-y",
        `${coverage ? (height * coverage.y) / coverage.sourceHeight : 0}px`,
      );
    }
    if (canvasCurrent) return;
    this.outputs.set(canvas, { coverage, wrapped });
    canvas.style.left = wrapped
      ? "0"
      : `${coverage ? (100 * coverage.x) / coverage.sourceWidth : 0}%`;
    canvas.style.top = wrapped
      ? "0"
      : `${coverage ? (100 * coverage.y) / coverage.sourceHeight : 0}%`;
    canvas.style.width = wrapped
      ? "100%"
      : `${coverage ? (100 * coverage.width) / coverage.sourceWidth : 100}%`;
    canvas.style.height = wrapped
      ? "100%"
      : `${coverage ? (100 * coverage.height) / coverage.sourceHeight : 100}%`;
  }
  resizeCoverage(width: number, height: number) {
    if (this.measured?.width !== width || this.measured.height !== height)
      this.measured = { width, height };
    if (!this.options.foil) return;
    const size = this.coverageFrame
      ? `${this.coverageFrame.width},${this.coverageFrame.height}`
      : `${width},${height}`;
    if (size === this.coverageSize) return;
    this.coverageSize = size;
    this.replacePrintCut(this.options.print, this.options.cut, true);
  }
  /** Only first exposure admits decoding and uploads; covering a ready surface keeps its resources. */
  initialize() {
    if (this.initializationAttempted || !this.live || document.hidden || !this.canvas.isConnected)
      return;
    if (this.options.active && !this.options.active()) return;
    const box = this.container.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) return;
    if (!this.container.clientWidth || !this.container.clientHeight) return;
    this.initializationAttempted = true;
    try {
      this.gpu = sharedRenderer();
      this.gpu.surfaces.add(this);
      const gpu = this.gpu;
      if (gpu.textureValidationFailure) {
        this.failed(gpu.textureValidationFailure);
        return;
      }
      this.normalTexture = gpu.flat;
      this.heightTexture = gpu.flatHeight;
      this.replaceNormal(this.options.normal);
      this.replacePrintCut(this.options.print, this.options.cut);
    } catch (error) {
      this.failed(String(error));
    }
  }
  failed(why: string) {
    this.renderFailed = true;
    this.finishCreaseReveal();
    this.canvas.dataset.state = "failed";
    this.canvas.dataset.error = why;
    console.error(`Rendering the sticker material for ${this.options.print} failed: ${why}`);
    notePerformance("sticker material", why);
    this.settleWaiters();
  }
  loadError(kind: "printCut" | "normal", why: string | null) {
    if (this.gpu?.textureValidationFailure) {
      if (!this.renderFailed) this.failed(this.gpu.textureValidationFailure);
      return;
    }
    if (kind === "printCut") this.printCutError = why;
    else this.normalError = why;
    const errors = [this.printCutError, this.normalError, this.foilError]
      .filter(Boolean)
      .join("; ");
    if (errors) this.canvas.dataset.error = errors;
    else delete this.canvas.dataset.error;
    if (why) {
      const completesReadyReveal =
        kind === "printCut" &&
        this.revealing &&
        this.textures !== null &&
        this.normalUrl === this.options.normal;
      // A retained print can complete the bend next frame; its paint waits for that actual copy.
      this.finishCreaseReveal(!completesReadyReveal);
      console.error(`Rendering the sticker material for ${this.options.print} failed: ${why}`);
      notePerformance("sticker material", why);
      // A failed print upgrade can unblock a ready normal over the retained print and cut.
      if (completesReadyReveal) this.draw();
    }
    this.settleWaiters();
  }
  /** A retained bitmap is settled only after its current requested material has reached it. */
  settled(expected?: { normal?: string }) {
    if (this.materialUpdating) return false;
    if (
      this.snapshotMaterial !== materialIdentity(this.options) &&
      !this.renderFailed &&
      !this.printCutError
    )
      return false;
    if (expected) {
      if (
        this.hasSnapshot &&
        (this.snapshotNormal === expected.normal ||
          (this.normalFailure !== null && this.normalFailure.url === expected.normal))
      )
        return true;
      return (
        this.options.normal === expected.normal &&
        (this.renderFailed || (!this.pendingPrintCut && this.printCutError !== null))
      );
    }
    // A copied complete normal remains visible if reacquiring its texture fails.
    if (this.seededCopy && this.normalFailure && !this.pendingPrintCut) return true;
    // A failed first print cannot produce a snapshot; its pending normal must not hold the failure.
    if (
      this.renderFailed ||
      (!this.hasSnapshot && !this.pendingPrintCut && this.printCutError !== null)
    )
      return true;
    return (
      !this.pendingPrintCut && !this.pendingNormal && !this.snapshotPending && this.hasSnapshot
    );
  }
  whenSettled(expected?: { normal?: string }, signal?: AbortSignal): Promise<void> {
    if (!this.live || signal?.aborted || this.settled(expected)) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const waiter = {
        expected,
        finish: () => {
          this.waiters.delete(waiter);
          signal?.removeEventListener("abort", waiter.finish);
          resolve();
        },
      };
      this.waiters.add(waiter);
      signal?.addEventListener("abort", waiter.finish, { once: true });
    });
  }
  settleWaiters() {
    for (const waiter of this.waiters)
      if (!this.live || this.settled(waiter.expected)) waiter.finish();
  }
  /** Registered material changes commit together; sharp print refinement remains independent. */
  commitMaterials() {
    const material = this.pendingPrintCut;
    if (
      material &&
      (material.identity !== this.printCut?.identity || this.pendingNormal?.material === material)
    ) {
      if (!material.commit || (this.pendingNormal && !this.pendingNormal.commit)) return;
      this.pendingNormal?.commit?.();
      material.commit();
      return;
    }
    this.pendingNormal?.commit?.();
    material?.commit?.();
  }
  /** A sharp print replaces its cut with it, while the previous complete sticker remains visible. */
  replacePrintCut(print: string, cut: string, force = false) {
    const identity = materialIdentity(this.options);
    const gpu = this.gpu;
    if (
      !gpu ||
      gpu.disposed ||
      !this.live ||
      (this.pendingPrintCut?.print === print &&
        this.pendingPrintCut.cut === cut &&
        this.pendingPrintCut.identity === identity &&
        !force)
    )
      return;
    if (this.pendingPrintCut) {
      const old = this.pendingPrintCut;
      this.pendingPrintCut = null;
      if (this.pendingNormal?.material === old) this.pendingNormal = null;
      old.gpu.release(old.print);
      old.gpu.release(old.cut);
      if (old.foilKey) old.gpu.releaseFoil(old.foilKey);
    }
    const width = this.coverageFrame?.width ?? this.container.clientWidth;
    const height = this.coverageFrame?.height ?? this.container.clientHeight;
    const acquiredFrame = this.printCut?.foil?.description.frame;
    if (
      this.printCut?.print === print &&
      this.printCut.cut === cut &&
      this.printCut.identity === identity &&
      !this.printCutError &&
      (!this.options.foil || (acquiredFrame?.width === width && acquiredFrame.height === height)) &&
      !force
    ) {
      this.loadError("printCut", null);
      return;
    }
    this.coverageSize = `${width},${height}`;
    const foilMaterial = this.options.foil;
    const foil = foilMaterial
      ? gpu.acquireFoil(foilMaterial, cut, this.container, width, height)
      : undefined;
    const finish = this.options.finish;
    const pending: NonNullable<MountedSurface["pendingPrintCut"]> = {
      print,
      cut,
      gpu,
      foilKey: foil?.key,
      identity,
      reject: (error: unknown) => {
        // Canceled generations already released their refs; only the current request reports failure.
        if (!this.live || this.gpu !== gpu || gpu.disposed || this.pendingPrintCut !== pending)
          return;
        this.pendingPrintCut = null;
        // The normal belongs to this complete material change, so failure retires both stages.
        if (
          this.pendingNormal &&
          (identity !== this.printCut?.identity || this.pendingNormal.material === pending)
        ) {
          const normal = this.pendingNormal;
          this.pendingNormal = null;
          if (normal.url) normal.gpu.release(normal.url);
          if (normal.height) normal.gpu.release(normal.height);
        }
        gpu.release(print);
        gpu.release(cut);
        if (foil) gpu.releaseFoil(foil.key);
        const why = `Replacing sticker print and cut (${print}, ${cut}) failed: ${String(error)}`;
        if (!this.hasSnapshot) this.canvas.dataset.state = "failed";
        this.loadError("printCut", why);
      },
    };
    this.renderFailed = false;
    this.pendingPrintCut = pending;
    // An earlier terminal failure cannot settle this newly requested generation.
    this.loadError("printCut", null);
    // Resize can replace acquisition without a new updateSticker call; removal follows its owner.
    if (this.normalUrl && !this.options.normal) this.replaceNormal();
    // A first load whose foil can't be prepared commits paper and laminate without it; a complete
    // generation already shown is kept instead, as for any failed replacement.
    let foilFailure: string | null = null;
    Promise.all([
      gpu.acquire(print),
      gpu.acquire(cut),
      foil?.resources.then(
        (resources) => {
          const error = this.geometryError(this.options.normal, resources.coverage);
          if (error) throw new Error(error);
          return resources;
        },
        (error: unknown) => {
          if (this.hasSnapshot) throw error;
          foilFailure = `Preparing ${foilMaterial?.style} foil for ${cut} failed: ${String(error)}`;
          return undefined;
        },
      ),
    ]).then(([printTexture, cutTexture, foilResources]) => {
      if (!this.live || this.gpu !== gpu || gpu.disposed || this.pendingPrintCut !== pending)
        return;
      pending.commit = () => {
        this.pendingPrintCut = null;
        const old = this.printCut;
        this.printCut = {
          print,
          cut,
          textures: [printTexture, cutTexture],
          foil: foilResources,
          foilKey: foilResources && foil?.key,
          identity,
          finish,
        };
        if (foil && !foilResources) gpu.releaseFoil(foil.key);
        this.foilError = foilFailure;
        if (foilFailure) {
          console.error(`Rendering the sticker material for ${print} failed: ${foilFailure}`);
          notePerformance("sticker material", foilFailure);
        }
        this.textures = [
          printTexture,
          cutTexture,
          this.normalTexture ?? gpu.flat,
          this.heightTexture ?? gpu.flatHeight,
        ];
        this.snapshotPending = true;
        if (old) {
          gpu.release(old.print);
          gpu.release(old.cut);
          if (old.foilKey) gpu.releaseFoil(old.foilKey);
        }
        this.loadError("printCut", null);
        this.draw();
      };
      this.commitMaterials();
    }, pending.reject);
  }
  geometryError(normal: string | undefined, coverage = this.printCut?.foil?.coverage) {
    const c = coverage,
      bounds = this.options.normalBounds;
    if (
      normal &&
      c &&
      (c.x < 0 || c.y < 0 || c.width > c.sourceWidth || c.height > c.sourceHeight) &&
      (!bounds ||
        bounds.x > c.x / c.sourceWidth + 1e-7 ||
        bounds.y > c.y / c.sourceHeight + 1e-7 ||
        bounds.x + bounds.width < (c.x + c.width) / c.sourceWidth - 1e-7 ||
        bounds.y + bounds.height < (c.y + c.height) / c.sourceHeight - 1e-7)
    )
      return "Creased foil overflow requires a normal texture registered over its complete outer coverage";
    return null;
  }
  /** A crease rebake keeps its last ready snapshot until the replacement normal is uploaded. */
  replaceNormal(url?: string) {
    const gpu = this.gpu;
    const height = url ? this.options.height : undefined;
    if (
      !gpu ||
      gpu.disposed ||
      !this.live ||
      (this.pendingNormal &&
        this.pendingNormal.url === url &&
        this.pendingNormal.height === height &&
        JSON.stringify(this.pendingNormal.bounds) === JSON.stringify(this.options.normalBounds))
    )
      return;
    if (this.pendingNormal) {
      const old = this.pendingNormal;
      this.pendingNormal = null;
      if (old.url) old.gpu.release(old.url);
      if (old.height) old.gpu.release(old.height);
    }
    const changingMaterial =
      this.pendingPrintCut && this.pendingPrintCut.identity !== this.printCut?.identity;
    const geometryError = changingMaterial ? null : this.geometryError(url);
    if (geometryError) {
      this.normalFailure = url ? { url } : null;
      this.loadError("normal", geometryError);
      return;
    }
    if (
      this.normalUrl === url &&
      this.heightUrl === height &&
      JSON.stringify(this.normalBounds) === JSON.stringify(this.options.normalBounds)
    ) {
      this.normalFailure = null;
      this.loadError("normal", null);
      this.showCreaseProgress(this.reveal?.progress ?? 1);
      if (!this.hasSnapshot) this.draw();
      return;
    }
    if (!url) {
      const commit = () => {
        this.pendingNormal = null;
        this.finishCreaseReveal();
        const old = this.normalUrl;
        const oldHeight = this.heightUrl;
        this.normalUrl = undefined;
        this.heightUrl = undefined;
        this.normalBounds = undefined;
        this.normalTexture = gpu.flat;
        this.heightTexture = gpu.flatHeight;
        this.normalFailure = null;
        if (this.textures) {
          this.textures[2] = gpu.flat;
          this.textures[3] = gpu.flatHeight;
        }
        this.snapshotPending = true;
        this.renderFailed = false;
        if (old) gpu.release(old);
        if (oldHeight) gpu.release(oldHeight);
        this.loadError("normal", null);
        this.draw();
      };
      if (this.pendingPrintCut) {
        // A ready flat transition belongs to the required replacement, including print/cut-only
        // changes. Keep the accepted normal, bounds and texture until that generation commits.
        this.pendingNormal = {
          gpu,
          material: this.pendingPrintCut,
          bounds: this.options.normalBounds,
          commit,
        };
        this.commitMaterials();
      } else commit();
      return;
    }
    const pending: NonNullable<MountedSurface["pendingNormal"]> = {
      url,
      height,
      gpu,
      bounds: this.options.normalBounds,
    };
    const normalBounds = this.options.normalBounds;
    this.renderFailed = false;
    this.normalFailure = null;
    this.pendingNormal = pending;
    /** Lets go of this generation's textures, which commit or fail together. */
    const releasePending = () => {
      gpu.release(url);
      if (height) gpu.release(height);
    };
    Promise.all([
      gpu.acquire(url),
      height ? gpu.acquire(height) : Promise.resolve(gpu.flatHeight),
    ]).then(
      ([texture, heightTexture]) => {
        if (!this.live || this.gpu !== gpu || gpu.disposed || this.pendingNormal !== pending)
          return;
        const changingMaterial =
          this.pendingPrintCut && this.pendingPrintCut.identity !== this.printCut?.identity;
        const geometryError = changingMaterial ? null : this.geometryError(url);
        if (geometryError) {
          this.pendingNormal = null;
          releasePending();
          this.normalFailure = { url };
          this.loadError("normal", geometryError);
          return;
        }
        pending.commit = () => {
          this.pendingNormal = null;
          const old = this.normalUrl;
          const oldHeight = this.heightUrl;
          this.normalUrl = url;
          this.heightUrl = height;
          this.normalBounds = normalBounds;
          this.normalTexture = texture;
          this.heightTexture = heightTexture;
          this.normalFailure = null;
          if (this.textures) {
            this.textures[2] = texture;
            this.textures[3] = heightTexture;
          }
          this.snapshotPending = true;
          if (old) gpu.release(old);
          if (oldHeight) gpu.release(oldHeight);
          this.loadError("normal", null);
          gpu.stopReveal(this);
          this.reveal =
            this.options.onCreaseProgress &&
            this.container !== this.canvas &&
            !gpu.reduced.matches &&
            CSS.supports("mix-blend-mode", "plus-lighter") &&
            this.completedNormal !== url &&
            this.options.canRevealCrease?.(url) === true
              ? { normal: url, admitted: false, started: null, progress: 0 }
              : null;
          this.draw();
        };
        this.commitMaterials();
      },
      (error: unknown) => {
        // Canceled generations have released their ownership; only the current request reports failure.
        if (!this.live || this.gpu !== gpu || gpu.disposed || this.pendingNormal !== pending)
          return;
        this.pendingNormal = null;
        this.normalFailure = { url };
        releasePending();
        // The height belongs to the normal's generation; the error names whichever URL failed.
        const why = `Replacing crease normal ${url} failed: ${String(error)}`;
        // Keep the ready laminate visible; its last normal remains valid after a failed rebake.
        this.loadError("normal", why);
        if (this.pendingPrintCut && this.pendingPrintCut.identity !== this.printCut?.identity)
          this.pendingPrintCut.reject(why);
        if (!this.hasSnapshot) this.draw();
      },
    );
  }
  draw() {
    this.initialize();
    if (this.gpu?.textureValidationFailure) {
      if (!this.renderFailed) this.failed(this.gpu.textureValidationFailure);
      return;
    }
    if (!this.textures) return;
    this.gpu?.refresh(this);
  }
  get revealing() {
    return this.reveal !== null;
  }
  /** One temporary flat snapshot keeps every part of the artwork visible beneath the bent one. */
  flatSnapshot(): HTMLCanvasElement {
    if (!this.flat) {
      this.flat = document.createElement("canvas");
      this.flat.className = "sticker-material-flat";
      this.flat.setAttribute("aria-hidden", "true");
      this.flatFrame = document.createElement("span");
      this.flatFrame.className = "crease-reveal-frame crease-reveal-frame--flat";
      const content = document.createElement("span");
      content.className = "crease-reveal-content";
      content.append(this.flat);
      this.flatFrame.append(content);
      this.container.prepend(this.flatFrame);
    }
    return this.flat;
  }
  /** Only a renderable ready generation spends time on the finite sweep. */
  creaseProgress(now: number): number {
    const reveal = this.reveal;
    if (!reveal) return 1;
    reveal.started ??= now;
    const time = this.gpu?.reduced.matches
      ? 1
      : Math.min(1, (now - reveal.started) / CREASE_REVEAL_MS);
    // Even diagonal travel keeps a small crease's visible change spread across the short press.
    reveal.progress = time;
    if (time === 1) {
      this.finishCreaseReveal();
    }
    return reveal.progress;
  }
  /** Publish after the snapshot copy, so the painted crease and reflected bend share a frame. */
  showCreaseProgress(progress: number) {
    if (this.normalUrl && this.normalUrl === this.options.normal) {
      this.container.style.setProperty("--crease-reveal", String(progress));
      this.options.onCreaseProgress?.(this.normalUrl, progress);
    }
  }
  /** Hidden, retired, or failed material leaves no unfinished paint mask or ongoing frames. */
  finishCreaseReveal(showPaint = true) {
    const normal = this.options.normal;
    this.reveal = null;
    this.gpu?.stopReveal(this);
    delete this.container.dataset.creaseReveal;
    if (this.flat) {
      this.flatFrame?.remove();
      releaseCanvas(this.flat);
      this.flat = null;
      this.flatFrame = null;
    }
    if (normal) {
      this.completedNormal = normal;
      // Native fallback may show its crease; a retained coating needs the same committed normal.
      const matchingCoating =
        !this.hasSnapshot || this.renderFailed || this.snapshotNormal === normal;
      if (showPaint && matchingCoating) this.options.onCreaseProgress?.(normal, 1);
    }
  }
  release() {
    if (!this.live) return;
    this.live = false;
    this.showFoilCoverage(undefined);
    for (const invalidate of [...this.copies]) invalidate();
    this.copies.clear();
    this.foilCommits.clear();
    this.finishCreaseReveal();
    this.settleWaiters();
    const gpu = this.gpu;
    this.gpu = null;
    this.textures = null;
    if (!gpu) return;
    gpu.surfaces.delete(this);
    gpu.refreshes.delete(this);
    gpu.following.delete(this);
    if (this.printCut) {
      gpu.release(this.printCut.print);
      gpu.release(this.printCut.cut);
      if (this.printCut.foilKey) gpu.releaseFoil(this.printCut.foilKey);
    }
    if (this.pendingPrintCut) {
      this.pendingPrintCut.gpu.release(this.pendingPrintCut.print);
      this.pendingPrintCut.gpu.release(this.pendingPrintCut.cut);
      if (this.pendingPrintCut.foilKey)
        this.pendingPrintCut.gpu.releaseFoil(this.pendingPrintCut.foilKey);
    }
    this.printCut = null;
    this.pendingPrintCut = null;
    if (this.normalUrl) gpu.release(this.normalUrl);
    if (this.heightUrl) gpu.release(this.heightUrl);
    if (this.pendingNormal?.url) this.pendingNormal.gpu.release(this.pendingNormal.url);
    if (this.pendingNormal?.height) this.pendingNormal.gpu.release(this.pendingNormal.height);
    this.normalUrl = undefined;
    this.heightUrl = undefined;
    this.normalBounds = undefined;
    this.normalTexture = null;
    this.heightTexture = null;
    this.pendingNormal = null;
    if (!gpu.surfaces.size) destroyRenderer(gpu);
  }
}

/** A snapshot only changes after a published tilt, resize, load, or explicit container turn. */
export function mountSticker(canvas: HTMLCanvasElement, options: StickerSurface): () => void {
  return mountPresentation(canvas, options);
}
function mountPresentation(
  canvas: HTMLCanvasElement,
  options: StickerSurface,
  coverageFrame?: { width: number; height: number },
): () => void {
  // A reused React canvas can still say ready after its old snapshot was released.
  canvas.dataset.state = "loading";
  canvas.dataset.partial = (options.paperAmount ?? 1) < 1 ? "true" : "false";
  delete canvas.dataset.error;
  const surface = new MountedSurface(canvas, options, coverageFrame);
  mounted.set(canvas, surface);
  const resize = new ResizeObserver(() => surface.draw());
  resize.observe(canvas);
  const entered = new IntersectionObserver((entries) => {
    // A held phone pose publishes nothing while scrolling; newly exposed surfaces still need a snapshot.
    if (entries.some((entry) => entry.isIntersecting)) surface.draw();
    else surface.finishCreaseReveal();
  });
  entered.observe(canvas);
  const show = () => {
    if (!document.hidden) surface.draw();
  };
  document.addEventListener("visibilitychange", show);
  return () => {
    resize.disconnect();
    entered.disconnect();
    document.removeEventListener("visibilitychange", show);
    mounted.delete(canvas);
    surface.release();
    releaseCanvas(canvas);
  };
}

/** The displayed turn survives a texture replacement before a live gesture commits. */
export function stickerTurn(canvas: HTMLCanvasElement): number | undefined {
  return mounted.get(canvas)?.options.turn;
}

/** Material changes preserve the print, cut and ready snapshot owned by this surface. */
export function updateSticker(
  canvas: HTMLCanvasElement,
  options: Pick<
    StickerSurface,
    "print" | "cut" | "normal" | "height" | "finish" | "foil" | "normalBounds"
  >,
  requestedCoverageFrame?: { width: number; height: number },
) {
  if (
    requestedCoverageFrame &&
    (!Number.isFinite(requestedCoverageFrame.width) ||
      !Number.isFinite(requestedCoverageFrame.height) ||
      requestedCoverageFrame.width <= 0 ||
      requestedCoverageFrame.height <= 0)
  )
    throw new Error("A requested sticker coverage frame requires finite positive dimensions");
  const surface = mounted.get(canvas);
  if (!surface) return;
  const frameChanged =
    requestedCoverageFrame !== undefined &&
    (surface.coverageFrame?.width !== requestedCoverageFrame.width ||
      surface.coverageFrame?.height !== requestedCoverageFrame.height);
  if (requestedCoverageFrame) surface.coverageFrame = { ...requestedCoverageFrame };
  const finishChanged =
    frameChanged || materialIdentity(surface.options) !== materialIdentity(options);
  surface.materialUpdating = true;
  try {
    Object.assign(surface.options, options, {
      foil: options.foil,
      height: options.height,
      normalBounds: options.normalBounds,
    });
    if (surface.gpu?.textureValidationFailure) {
      surface.failed(surface.gpu.textureValidationFailure);
      return;
    }
    // Deferred admission has no GPU yet; only a failure releases the matching fallback paint.
    if (surface.renderFailed || surface.gpu?.disposed || surface.gpu?.lost)
      surface.finishCreaseReveal();
    surface.replacePrintCut(options.print, options.cut, frameChanged);
    surface.replaceNormal(options.normal);
    if (finishChanged) {
      surface.snapshotPending = true;
      surface.renderFailed = false;
    }
    if (finishChanged || !surface.gpu) surface.draw();
  } finally {
    surface.materialUpdating = false;
    surface.settleWaiters();
  }
}

/** Board gestures and finite flights change the surface geometry under the held light. */
export function turnSticker(canvas: HTMLCanvasElement, turn: number, tiltX = 0, tiltY = 0) {
  const surface = mounted.get(canvas);
  if (
    !surface ||
    (surface.options.turn === turn &&
      (surface.options.tiltX ?? 0) === tiltX &&
      (surface.options.tiltY ?? 0) === tiltY)
  )
    return;
  Object.assign(surface.options, { turn, tiltX, tiltY });
  surface.draw();
}

/** A sticker moved on screen reflects the room from its new spot, even when its turn holds. */
export function moveSticker(canvas: HTMLCanvasElement, turn: number) {
  const surface = mounted.get(canvas);
  if (!surface) return;
  Object.assign(surface.options, { turn, tiltX: 0, tiltY: 0 });
  surface.draw();
}

/** A sticker in motion on screen, such as one sticking to the board, redraws each frame until it settles. */
export function followSticker(canvas: HTMLCanvasElement, motion: Promise<unknown>) {
  const surface = mounted.get(canvas);
  surface?.gpu?.follow(surface, motion);
}

/** An exposed tray face samples the held pose after spending time inside the closed tray. */
export function refreshSticker(canvas: HTMLCanvasElement) {
  const surface = mounted.get(canvas);
  surface?.draw();
}

/** Waits for current material, or a baseline normal on retained print; never starts a covered surface. */
export function whenStickerSettled(
  canvas: HTMLCanvasElement,
  expected?: { normal?: string },
  signal?: AbortSignal,
): Promise<void> {
  return mounted.get(canvas)?.whenSettled(expected, signal) ?? Promise.resolve();
}

/** The coated paper fades independently; full paper coverage still occludes foil. */
export function setStickerAmounts(
  canvas: HTMLCanvasElement,
  paperAmount: number,
  foilAmount: number,
) {
  const surface = mounted.get(canvas);
  if (
    !surface ||
    ((surface.options.paperAmount ?? 1) === paperAmount &&
      (surface.options.foilAmount ?? 1) === foilAmount)
  )
    return;
  Object.assign(surface.options, { paperAmount, foilAmount });
  surface.snapshotPending = true;
  canvas.dataset.partial = paperAmount < 1 ? "true" : "false";
  surface.draw();
}

/** A temporary presentation shares assets and light, while retaining its own geometry and lifetime. */
export function mountStickerCopy(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement,
  active: () => boolean,
  onInvalidated?: () => void,
): () => void {
  const owner = mounted.get(source);
  if (!owner?.live || !owner.hasSnapshot || !owner.snapshotOptions) {
    releaseCanvas(canvas);
    canvas.dataset.state = "loading";
    onInvalidated?.();
    return () => {};
  }
  const release = mountPresentation(
    canvas,
    {
      ...owner.snapshotOptions,
      turn: owner.options.turn,
      tiltX: owner.options.tiltX,
      tiltY: owner.options.tiltY,
      normal: owner.snapshotNormal,
      normalBounds: owner.snapshotNormalBounds,
      active,
      onCreaseProgress: undefined,
      canRevealCrease: undefined,
      startCreaseReveal: undefined,
    },
    owner.snapshotCoverageFrame,
  );
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) {
    release();
    throw new Error("Copying the complete sticker finish failed: 2D context unavailable");
  }
  context.globalCompositeOperation = "copy";
  context.drawImage(source, 0, 0);
  canvas.dataset.state = "ready";
  canvas.dataset.foil = source.dataset.foil;
  const copy = mounted.get(canvas);
  if (copy) {
    copy.hasSnapshot = true;
    copy.seededCopy = true;
    copy.snapshotNormal = owner.snapshotNormal;
    copy.snapshotNormalBounds = owner.snapshotNormalBounds;
    copy.snapshotMaterial = owner.snapshotMaterial;
    copy.snapshotOptions = { ...owner.snapshotOptions };
    copy.snapshotCoverageFrame = owner.snapshotCoverageFrame;
    copy.showFoilCoverage(owner.snapshotFoilCoverage);
    copy.sizeOutput(canvas, owner.snapshotFoilCoverage?.coverage);
  }
  let live = true;
  const stop = () => {
    if (!live) return;
    live = false;
    owner.copies.delete(invalidate);
    release();
  };
  const invalidate = () => {
    stop();
    canvas.dataset.state = "loading";
    onInvalidated?.();
  };
  owner.copies.add(invalidate);
  return stop;
}

/** The immutable alpha description belonging to this canvas's retained complete output. */
export function stickerFoilCoverage(canvas: HTMLCanvasElement): StickerFoilCoverage | undefined {
  const owner = mounted.get(canvas);
  return owner?.live && owner.hasSnapshot ? owner.snapshotFoilCoverage : undefined;
}

/** Observe changed foil descriptors only after their complete pixels commit; no initial callback.
 * Pose-only copies retain descriptor identity. Disposal releases every subscription. */
export function subscribeStickerFoilCoverage(
  canvas: HTMLCanvasElement,
  committed: (coverage: StickerFoilCoverage | undefined) => void,
): () => void {
  const surface = mounted.get(canvas);
  if (!surface?.live) return () => {};
  surface.foilCommits.add(committed);
  return () => {
    surface.foilCommits.delete(committed);
  };
}
