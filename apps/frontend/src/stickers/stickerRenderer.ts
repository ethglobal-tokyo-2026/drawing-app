import {
  createFoilLookup,
  createFoilSourceSamples,
  FOIL_ROOM,
  FOIL_STYLES,
  type Rgb,
} from "./foilMaterial";
import {
  acquireFoilCoverage,
  FOIL_COVERAGE_TIMEOUT_MS,
  holdFoilCoverageMask,
  type SharedFoilCoverage,
} from "./acquireFoilCoverage";
import { type FoilCoverage } from "./foilCoverage";
import { stickerFoilColors, type StickerFoilMaterial } from "./stickerFoilMaterial";
export type { StickerFoilMaterial } from "./stickerFoilMaterial";
import { currentLight, subscribeLight } from "./light";
import {
  isPerformanceRecorderOn,
  notePerformance,
  timeOurWork,
} from "../performance/performanceRecorder";
import { stickerFragment, stickerVertex } from "./stickerShader";
import { releaseCanvas } from "../ui/releaseCanvas";
import { REDUCED_MOTION } from "../ui/useReducedMotion";
import { setCreaseRevealSize } from "./creaseRevealSize";

/** The same short set-down timing as a board sticker's press. */
const CREASE_REVEAL_MS = 220;
/** Image uploads share one later task; no individual upload immediately queries GPU errors. */
const TEXTURE_VALIDATION_DELAY_MS = 16;
const TEXTURE_VALIDATION_TIMEOUT_MS = 20_000;
/** How long fetching and decoding one image may take. */
const TEXTURE_LOAD_TIMEOUT_MS = 20_000;
/** A failed check drains the finite WebGL error flags before another upload batch can proceed. */
const MAX_TEXTURE_ERROR_CHECKS = 8;

interface TextureValidation {
  url: string;
  finish: (failure?: string) => void;
}

export type LaminateFinish = "gloss" | "matte";
export interface StickerSurface {
  print: string;
  cut: string;
  normal?: string;
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

type FoilLookup = ReturnType<typeof createFoilLookup>;
type FoilResources = {
  lookupData: FoilLookup;
  frame: { width: number; height: number };
  coverage: SharedFoilCoverage;
  description: StickerFoilCoverage;
  outer: WebGLTexture;
  lookup: WebGLTexture;
  tint: number[];
  ink: number[];
  material: StickerFoilMaterial;
};
const foilSources = createFoilSourceSamples(FOIL_ROOM);
const materialIdentity = (options: Pick<StickerSurface, "foil" | "finish" | "normalBounds">) =>
  JSON.stringify([options.finish, options.foil, options.normalBounds]);

/** One GPU context computes the coating; each visible sticker keeps its own 2D snapshot. */
class StickerRenderer {
  readonly canvas = document.createElement("canvas");
  readonly uniforms = new Map<string, WebGLUniformLocation | null>();
  readonly normalTransform = new Float32Array(9);
  readonly gl: WebGLRenderingContext;
  readonly program: WebGLProgram;
  readonly textures = new Map<
    string,
    { users: number; texture: Promise<WebGLTexture>; abort: AbortController }
  >();
  readonly foilLookups = new Map<FoilLookup, { users: number; texture: Promise<WebGLTexture> }>();
  readonly foils = new Map<
    string,
    {
      users: number;
      abort: AbortController;
      releaseCoverage: () => void;
      resources: Promise<FoilResources>;
    }
  >();
  readonly surfaces = new Set<MountedSurface>();
  readonly refreshes = new Set<MountedSurface>();
  readonly reveals = new Set<MountedSurface>();
  readonly textureValidations = new Set<TextureValidation>();
  textureValidationTimer = 0;
  /** An undrained or unreadable error state cannot be used for later uploads or snapshots. */
  textureValidationFailure: string | null = null;
  refreshFrame = 0;
  revealFrame = 0;
  readonly flat: WebGLTexture;
  readonly buffer: WebGLBuffer;
  readonly atlasLimit: number;
  readonly stopLight: () => void = () => {};
  readonly reduced = matchMedia(REDUCED_MOTION);
  readonly motionChanged = () => {
    if (this.reduced.matches) for (const surface of [...this.reveals]) surface.finishCreaseReveal();
  };
  lost = false;
  disposed = false;
  readonly contextLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
    this.cancelTextureValidations("The shared sticker material GPU context was lost");
    for (const surface of this.surfaces)
      surface.failed("The shared sticker material GPU context was lost");
  };
  readonly contextRestored = () => {
    // The restored context has invalidated every resource from its previous generation.
    const mounted = [...this.surfaces];
    this.destroy();
    if (renderer === this) renderer = null;
    for (const surface of mounted) surface.reload();
  };

  constructor() {
    const gl = this.canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    });
    if (!gl) throw new Error("WebGL is unavailable");
    this.gl = gl;
    try {
      if (!gl.getExtension("OES_standard_derivatives"))
        throw new Error("Sticker finish derivatives are unavailable");
      const renderLimit: unknown = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      if (typeof renderLimit !== "number" || renderLimit < 1024)
        throw new Error("The sticker material render buffer limit is unavailable or too small");
      this.atlasLimit = Math.min(2048, renderLimit);
      const shader = (kind: number, source: string) => {
        const result = gl.createShader(kind);
        if (!result) throw new Error("Allocating the sticker material shader failed");
        gl.shaderSource(result, source);
        gl.compileShader(result);
        if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
          const message = gl.getShaderInfoLog(result);
          gl.deleteShader(result);
          throw new Error(`Compiling the sticker material shader failed: ${message}`);
        }
        return result;
      };
      const vertex = shader(gl.VERTEX_SHADER, stickerVertex);
      const fragment = shader(gl.FRAGMENT_SHADER, stickerFragment);
      const program = gl.createProgram();
      if (!program) throw new Error("Allocating the sticker material program failed");
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(
          `Linking the sticker material program failed: ${gl.getProgramInfoLog(program)}`,
        );
      this.program = program;
      for (const name of [
        "printImage",
        "cutImage",
        "normalImage",
        "size",
        "normalTransform",
        "pointTurn",
        "roughness",
        "creaseReveal",
        "outerImage",
        "sourceBounds",
        "normalBounds",
        "amounts",
        "hasFoil",
        "foilLookup",
        "foilTint",
        "foilInk",
        "foilStyle",
        "foilSources[0]",
        "opaquePaper",
      ])
        this.uniforms.set(name, gl.getUniformLocation(program, name));
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error("Allocating the sticker material geometry failed");
      this.buffer = buffer;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      this.flat = this.texture(new Uint8Array([128, 128, 255, 255]));
      // The flat normal validates immediately; every later upload validates as a batch.
      const flatError = gl.getError();
      if (flatError !== gl.NO_ERROR || gl.isContextLost())
        throw new Error(`Uploading the sticker material flat normal texture failed (${flatError})`);
      this.stopLight = subscribeLight(() =>
        timeOurWork("laminate", () => {
          this.cancelRefresh();
          this.draw([...this.surfaces]);
        }),
      );
      this.canvas.addEventListener("webglcontextlost", this.contextLost);
      this.canvas.addEventListener("webglcontextrestored", this.contextRestored);
      this.reduced.addEventListener("change", this.motionChanged);
    } catch (error) {
      // A constructor that throws never becomes the shared renderer; release its partial allocation.
      this.disposed = true;
      this.stopLight();
      this.canvas.removeEventListener("webglcontextlost", this.contextLost);
      this.canvas.removeEventListener("webglcontextrestored", this.contextRestored);
      this.reduced.removeEventListener("change", this.motionChanged);
      if (!gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
      releaseCanvas(this.canvas);
      throw error;
    }
  }

  texture(
    source: TexImageSource | Uint8Array | Uint8ClampedArray,
    width = 1,
    height = 1,
    format: GLenum = this.gl.RGBA,
  ): WebGLTexture {
    const gl = this.gl;
    if (this.disposed || this.lost || gl.isContextLost())
      throw new Error("The sticker material GPU context is unavailable during texture upload");
    if (this.textureValidationFailure) throw new Error(this.textureValidationFailure);
    const texture = gl.createTexture();
    if (!texture) throw new Error("Allocating a sticker material texture failed");
    try {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      if (source instanceof Uint8Array || source instanceof Uint8ClampedArray) {
        // Single-byte alpha rows are not padded to four bytes.
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        const pixels = new Uint8Array(source.buffer, source.byteOffset, source.length);
        gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, gl.UNSIGNED_BYTE, pixels);
      } else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      return texture;
    } catch (error) {
      if (!gl.isContextLost()) gl.deleteTexture(texture);
      throw error;
    }
  }

  validateTexture(texture: WebGLTexture, url: string, signal: AbortSignal): Promise<WebGLTexture> {
    return new Promise((resolve, reject) => {
      let finished = false;
      let deadline = 0;
      const cancel = () => pending.finish(String(signal.reason));
      const pending: TextureValidation = {
        url,
        finish: (failure) => {
          if (finished) return;
          finished = true;
          this.textureValidations.delete(pending);
          window.clearTimeout(deadline);
          signal.removeEventListener("abort", cancel);
          if (!this.textureValidations.size) {
            window.clearTimeout(this.textureValidationTimer);
            this.textureValidationTimer = 0;
          }
          if (failure) {
            if (!this.lost && !this.gl.isContextLost()) this.gl.deleteTexture(texture);
            reject(new Error(`Validating sticker material texture ${url} failed: ${failure}`));
          } else resolve(texture);
        },
      };
      if (signal.aborted) {
        cancel();
        return;
      }
      if (this.disposed || this.lost || this.gl.isContextLost() || this.textureValidationFailure) {
        pending.finish(
          this.textureValidationFailure ?? "The sticker material GPU context is unavailable",
        );
        return;
      }
      this.textureValidations.add(pending);
      signal.addEventListener("abort", cancel, { once: true });
      deadline = window.setTimeout(
        () => pending.finish(`Validation exceeded ${TEXTURE_VALIDATION_TIMEOUT_MS / 1000} seconds`),
        TEXTURE_VALIDATION_TIMEOUT_MS,
      );
      if (!this.textureValidationTimer)
        this.textureValidationTimer = window.setTimeout(
          () => timeOurWork("laminate upload validation", () => this.validateTextures()),
          TEXTURE_VALIDATION_DELAY_MS,
        );
    });
  }

  validateTextures() {
    this.textureValidationTimer = 0;
    const batch = [...this.textureValidations];
    if (!batch.length) return;
    const urls = batch.map(({ url }) => url).join(", ");
    const errors: number[] = [];
    let failure: string | undefined;
    try {
      if (this.disposed || this.lost || this.gl.isContextLost())
        failure = "The sticker material GPU context is unavailable";
      else {
        for (let checks = 0; checks < MAX_TEXTURE_ERROR_CHECKS; checks++) {
          const error = this.gl.getError();
          if (error !== this.gl.NO_ERROR) errors.push(error);
          if (this.lost || this.gl.isContextLost()) {
            failure = "The shared sticker material GPU context was lost";
            break;
          }
          if (error === this.gl.NO_ERROR) break;
          if (checks + 1 === MAX_TEXTURE_ERROR_CHECKS) {
            failure = `GPU errors did not clear after ${MAX_TEXTURE_ERROR_CHECKS} checks`;
            this.textureValidationFailure = failure;
          }
        }
      }
    } catch (error) {
      failure = `Checking sticker material texture uploads threw: ${String(error)}`;
      this.textureValidationFailure = failure;
    }
    if (errors.length || failure) {
      failure = `Uploading the sticker material texture batch failed (${errors.join(", ") || "no error code"})${failure ? `: ${failure}` : ""}; affected URLs: ${urls}`;
      if (this.textureValidationFailure) {
        this.textureValidationFailure = failure;
        this.cancelRefresh();
        // An unreadable shared error state also invalidates its ready owners; their bitmaps remain.
        for (const surface of this.surfaces) surface.failed(failure);
      }
    }
    for (const pending of batch) pending.finish(failure);
  }

  cancelTextureValidations(failure: string) {
    for (const pending of [...this.textureValidations]) pending.finish(failure);
  }

  acquireFoil(
    material: StickerFoilMaterial,
    cut: string,
    element: HTMLElement,
    width: number,
    height: number,
  ) {
    const colors = stickerFoilColors(element, material);
    const key = JSON.stringify([material, cut, width, height, colors]);
    const old = this.foils.get(key);
    if (old) {
      old.users++;
      return { key, resources: old.resources };
    }
    const abort = new AbortController();
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(FOIL_COVERAGE_TIMEOUT_MS)]);
    const acquired = acquireFoilCoverage(cut, material, width, height, signal);
    const resources = acquired.coverage.then(async (coverage) => {
      signal.throwIfAborted();
      if (this.disposed || this.lost)
        throw new Error(`Foil coverage for ${cut} belongs to a retired GPU context`);
      const lookupData = createFoilLookup(material.style, colors.palette);
      const lookup = this.acquireFoilLookup(lookupData);
      let outer: Promise<WebGLTexture>;
      try {
        // Coverage is one alpha byte per pixel; the shader reads only its alpha.
        outer = this.validateTexture(
          this.texture(coverage.alpha, coverage.width, coverage.height, this.gl.ALPHA),
          `foil coverage for ${cut}`,
          signal,
        );
      } catch (error) {
        this.releaseFoilLookup(lookupData);
        throw error;
      }
      let outerTexture: WebGLTexture | undefined;
      try {
        outerTexture = await outer;
        const lookupTexture = await lookup;
        return {
          lookupData,
          frame: { width, height },
          coverage,
          description: Object.freeze({
            cut,
            material: Object.freeze({
              ...material,
              palette:
                material.palette &&
                Object.freeze(
                  material.palette.map(([red, green, blue]) => {
                    const color: Rgb = [red, green, blue];
                    return Object.freeze(color);
                  }),
                ),
            }),
            frame: Object.freeze({ width, height }),
            coverage: Object.freeze({
              ...coverage,
              alpha: Object.freeze({
                length: coverage.alpha.length,
                at: (index: number) => coverage.alpha.at(index),
              }),
            }),
          }),
          outer: outerTexture,
          lookup: lookupTexture,
          tint: colors.tint,
          ink: colors.ink,
          material,
        };
      } catch (error) {
        if (outerTexture && !this.lost) this.gl.deleteTexture(outerTexture);
        this.releaseFoilLookup(lookupData);
        throw error;
      }
    });
    this.foils.set(key, { users: 1, abort, releaseCoverage: acquired.release, resources });
    return { key, resources };
  }
  releaseFoil(key: string) {
    const entry = this.foils.get(key);
    if (!entry || --entry.users > 0) return;
    this.foils.delete(key);
    entry.abort.abort();
    entry.releaseCoverage();
    // A live owner reports failures; retired owners only release resources.
    entry.resources.then(
      (resources) => {
        if (!this.lost) this.gl.deleteTexture(resources.outer);
        this.releaseFoilLookup(resources.lookupData);
      },
      () => {},
    );
  }

  /** Foils with the same style and palette share one lookup texture. */
  acquireFoilLookup(data: FoilLookup): Promise<WebGLTexture> {
    const old = this.foilLookups.get(data);
    if (old) {
      old.users++;
      return old.texture;
    }
    // Shared by every owner, so no single owner's cancellation can abort its validation.
    const texture = this.validateTexture(
      this.texture(data.pixels, data.width, data.height),
      "the foil lookup",
      new AbortController().signal,
    );
    // Every owner awaits it and reports its failure; this covers an owner that failed earlier.
    texture.catch(() => {});
    this.foilLookups.set(data, { users: 1, texture });
    return texture;
  }
  releaseFoilLookup(data: FoilLookup) {
    const entry = this.foilLookups.get(data);
    if (!entry || --entry.users > 0) return;
    this.foilLookups.delete(data);
    entry.texture.then(
      (texture) => {
        if (!this.lost) this.gl.deleteTexture(texture);
      },
      () => {},
    );
  }

  acquire(url: string): Promise<WebGLTexture> {
    const old = this.textures.get(url);
    if (old) {
      old.users++;
      return this.textureValidationFailure
        ? Promise.reject(new Error(this.textureValidationFailure))
        : old.texture;
    }
    const abort = new AbortController();
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(TEXTURE_LOAD_TIMEOUT_MS)]);
    const texture = (async () => {
      if (this.textureValidationFailure) throw new Error(this.textureValidationFailure);
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`Loading ${url} answered ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();
      try {
        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(() => {
            image.src = "";
            reject(new Error(`Decoding ${url} exceeded ${TEXTURE_LOAD_TIMEOUT_MS / 1000} seconds`));
          }, TEXTURE_LOAD_TIMEOUT_MS);
          const cancel = () => {
            window.clearTimeout(timer);
            image.src = "";
            reject(signal.reason);
          };
          signal.addEventListener("abort", cancel, { once: true });
          image.onload = () => {
            window.clearTimeout(timer);
            signal.removeEventListener("abort", cancel);
            resolve();
          };
          image.onerror = () => {
            window.clearTimeout(timer);
            signal.removeEventListener("abort", cancel);
            reject(new Error(`Decoding ${url} failed`));
          };
          if (signal.aborted) {
            cancel();
            return;
          }
          image.src = objectUrl;
        });
        signal.throwIfAborted();
        const longest = Math.max(image.naturalWidth, image.naturalHeight);
        if (longest <= 1024) return this.validateTexture(this.texture(image), url, signal);
        const scaled = document.createElement("canvas");
        scaled.width = Math.max(1, Math.round((image.naturalWidth * 1024) / longest));
        scaled.height = Math.max(1, Math.round((image.naturalHeight * 1024) / longest));
        try {
          const context = scaled.getContext("2d");
          if (!context) throw new Error(`Resizing ${url} failed: 2D context unavailable`);
          context.drawImage(image, 0, 0, scaled.width, scaled.height);
          return this.validateTexture(this.texture(scaled), url, signal);
        } finally {
          scaled.width = scaled.height = 0;
        }
      } finally {
        image.onload = image.onerror = null;
        URL.revokeObjectURL(objectUrl);
      }
    })();
    this.textures.set(url, { users: 1, texture, abort });
    return texture;
  }

  release(url: string) {
    const entry = this.textures.get(url);
    if (!entry || --entry.users > 0) return;
    this.textures.delete(url);
    entry.abort.abort();
    // Loading can finish after the last owner leaves; dispose that texture too.
    // A live surface reports loading failures. After final release only disposal remains.
    entry.texture.then(
      (texture) => {
        if (!this.lost) this.gl.deleteTexture(texture);
      },
      () => {},
    );
  }

  /** Re-exposure requests made in one commit share a batch after eligibility refs update. */
  refresh(surface: MountedSurface) {
    if (this.disposed || this.lost || this.textureValidationFailure) return;
    this.refreshes.add(surface);
    if (this.refreshFrame) return;
    this.refreshFrame = requestAnimationFrame(() => {
      this.refreshFrame = 0;
      const surfaces = [...this.refreshes];
      this.refreshes.clear();
      timeOurWork("laminate", () => this.draw(surfaces));
    });
  }

  cancelRefresh() {
    cancelAnimationFrame(this.refreshFrame);
    this.refreshFrame = 0;
    this.refreshes.clear();
  }

  /** Ready snapshots reveal on the compositor; no material copies are needed per animation frame. */
  reveal(surface: MountedSurface) {
    this.reveals.add(surface);
    if (this.revealFrame) return;
    this.revealFrame = requestAnimationFrame((now) => {
      this.revealFrame = 0;
      for (const item of [...this.reveals]) {
        if (
          document.hidden ||
          !item.canvas.isConnected ||
          (item.options.active && !item.options.active())
        ) {
          item.finishCreaseReveal();
          continue;
        }
        item.showCreaseProgress(item.creaseProgress(now));
        if (item.revealing) this.reveal(item);
      }
    });
  }

  stopReveal(surface: MountedSurface) {
    this.reveals.delete(surface);
    if (!this.reveals.size) {
      cancelAnimationFrame(this.revealFrame);
      this.revealFrame = 0;
    }
  }

  draw(surfaces: MountedSurface[]) {
    if (this.disposed || this.lost || this.textureValidationFailure) return;
    if (document.hidden) {
      for (const surface of surfaces) surface.finishCreaseReveal();
      return;
    }
    // Exposed owners reserve their geometry before assets arrive; partial requests only select draws.
    // Read the complete scene before allocation and snapshots change, avoiding interleaved layout.
    const jobs = [...this.surfaces].flatMap((surface) => {
      const { canvas } = surface;
      if (!canvas.isConnected || (surface.options.active && !surface.options.active())) {
        surface.finishCreaseReveal();
        return [];
      }
      const box = surface.container.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) {
        surface.finishCreaseReveal();
        return [];
      }
      const width = surface.container.clientWidth,
        height = surface.container.clientHeight;
      if (!width || !height) {
        surface.finishCreaseReveal();
        return [];
      }
      surface.resizeCoverage(width, height);
      const coverage = surface.printCut?.foil?.coverage;
      const outputWidth = coverage ? (width * coverage.width) / coverage.sourceWidth : width;
      const outputHeight = coverage ? (height * coverage.height) / coverage.sourceHeight : height;
      // The moving window keeps the unrounded local box, preserving the print's CSS sampling.
      const style = getComputedStyle(surface.container);
      const ratio = Math.min(devicePixelRatio || 1, 2, 1024 / Math.max(width, height));
      const job = {
        surface,
        width,
        height,
        revealWidth: parseFloat(style.width),
        revealHeight: parseFloat(style.height),
        sourceW: Math.max(1, Math.round(width * ratio)),
        sourceH: Math.max(1, Math.round(height * ratio)),
        w: Math.max(1, Math.round(outputWidth * ratio)),
        h: Math.max(1, Math.round(outputHeight * ratio)),
        x: 0,
        y: 0,
        target: canvas,
        creaseProgress: 1,
      };
      return surface.revealing ? [{ ...job, target: null, creaseProgress: 0 }, job] : [job];
    });
    type Tile = (typeof jobs)[number];
    const batches: Tile[][] = [];
    const limit = this.atlasLimit;
    let tiles: Tile[] = [],
      x = 0,
      y = 0,
      row = 0;
    const flush = () => {
      if (!tiles.length) return;
      batches.push(tiles);
      tiles = [];
      x = y = row = 0;
    };
    // Put tall tiles first so short stickers do not leave gaps beside later rows.
    jobs.sort((a, b) => b.h - a.h || b.w - a.w);
    for (const job of jobs) {
      if (x + job.w > limit) {
        x = 0;
        y += row;
        row = 0;
      }
      if (y + job.h > limit) flush();
      job.x = x;
      job.y = y;
      tiles.push(job);
      x += job.w;
      row = Math.max(row, job.h);
    }
    flush();
    const requested = new Set(surfaces);
    const draws = batches
      .map((batch) =>
        batch.filter(
          ({ surface }) =>
            requested.has(surface) &&
            surface.textures &&
            (surface.hasSnapshot || !surface.pendingNormal) &&
            !(surface.seededCopy && surface.options.normal !== surface.normalUrl) &&
            !(surface.revealing && surface.pendingPrintCut),
        ),
      )
      .filter((batch) => batch.length);
    if (!draws.length) return;
    const width = Math.max(...jobs.map((tile) => tile.x + tile.w));
    const height = Math.max(...jobs.map((tile) => tile.y + tile.h));
    try {
      // Scene changes may shrink storage; turns and texture arrivals keep the complete scene size.
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;
    } catch (error) {
      for (const batch of draws) for (const { surface } of batch) surface.failed(String(error));
      return;
    }
    for (const batch of draws) {
      try {
        this.drawTiles(batch);
      } catch (error) {
        for (const { surface } of batch) surface.failed(String(error));
      }
    }
  }

  drawTiles(
    tiles: {
      surface: MountedSurface;
      width: number;
      height: number;
      revealWidth: number;
      revealHeight: number;
      sourceW: number;
      sourceH: number;
      w: number;
      h: number;
      creaseProgress: number;
      target: HTMLCanvasElement | null;
      x: number;
      y: number;
    }[],
  ) {
    const recording = isPerformanceRecorderOn();
    const submittedAt = recording ? performance.now() : 0;
    const width = Math.max(...tiles.map((tile) => tile.x + tile.w));
    const height = Math.max(...tiles.map((tile) => tile.y + tile.h));
    const gl = this.gl;
    if (gl.drawingBufferWidth < width || gl.drawingBufferHeight < height)
      throw new Error(
        `The sticker material GPU drawing buffer is smaller than the batch for ${tiles.map((tile) => tile.surface.options.print).join(", ")}`,
      );
    gl.useProgram(this.program);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, gl.drawingBufferHeight - height, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);
    const pose = currentLight();
    const poseX = pose.y * 0.38,
      poseY = -pose.x * 0.38;
    const poseCosX = Math.cos(poseX),
      poseSinX = Math.sin(poseX),
      poseCosY = Math.cos(poseY),
      poseSinY = Math.sin(poseY);
    const normalTransform = this.normalTransform;
    const writeNormalColumn = (column: number, x: number, y: number, z: number) => {
      const across = poseCosX * y - poseSinX * z;
      const toward = poseSinX * y + poseCosX * z;
      normalTransform[column * 3] = poseCosY * x + poseSinY * toward;
      normalTransform[column * 3 + 1] = across;
      normalTransform[column * 3 + 2] = -poseSinY * x + poseCosY * toward;
    };
    for (const tile of tiles) {
      const { options, textures } = tile.surface;
      const material = tile.surface.printCut;
      const foil = material?.foil;
      if (!textures) continue;
      const output = foil?.coverage;
      setCreaseRevealSize(
        tile.surface.container,
        tile.revealWidth * (output ? output.width / output.sourceWidth : 1),
        tile.revealHeight * (output ? output.height / output.sourceHeight : 1),
      );
      gl.viewport(tile.x, gl.drawingBufferHeight - tile.y - tile.h, tile.w, tile.h);
      for (let i = 0; i < 3; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, textures[i]);
        gl.uniform1i(this.uniforms.get(["printImage", "cutImage", "normalImage"][i]) ?? null, i);
      }
      const coverage = foil?.coverage;
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, foil?.outer ?? this.flat);
      gl.uniform1i(this.uniforms.get("outerImage") ?? null, 3);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, foil?.lookup ?? this.flat);
      gl.uniform1i(this.uniforms.get("foilLookup") ?? null, 4);
      gl.uniform4f(
        this.uniforms.get("sourceBounds") ?? null,
        coverage ? coverage.x / coverage.sourceWidth : 0,
        coverage ? coverage.y / coverage.sourceHeight : 0,
        coverage ? coverage.width / coverage.sourceWidth : 1,
        coverage ? coverage.height / coverage.sourceHeight : 1,
      );
      const bounds = tile.surface.normalBounds;
      gl.uniform4f(
        this.uniforms.get("normalBounds") ?? null,
        bounds?.x ?? 0,
        bounds?.y ?? 0,
        bounds?.width ?? 1,
        bounds?.height ?? 1,
      );
      gl.uniform2f(
        this.uniforms.get("amounts") ?? null,
        options.foilAmount ?? 1,
        options.paperAmount ?? 1,
      );
      gl.uniform1f(this.uniforms.get("hasFoil") ?? null, foil ? 1 : 0);
      if (foil) {
        gl.uniform4fv(this.uniforms.get("foilSources[0]") ?? null, foilSources);
        gl.uniform3fv(this.uniforms.get("foilTint") ?? null, foil.tint);
        gl.uniform3fv(this.uniforms.get("foilInk") ?? null, foil.ink);
        gl.uniform1f(
          this.uniforms.get("foilStyle") ?? null,
          FOIL_STYLES.indexOf(foil.material.style),
        );
      }
      gl.uniform2f(this.uniforms.get("size") ?? null, tile.width, tile.height);
      const turn = ((options.turn + pose.rotationDegrees) * Math.PI) / 180,
        flightX = ((options.tiltX ?? 0) * Math.PI) / 180,
        flightY = ((options.tiltY ?? 0) * Math.PI) / 180;
      const cosTurn = Math.cos(turn),
        sinTurn = Math.sin(turn),
        cosX = Math.cos(flightX),
        sinX = Math.sin(flightX),
        cosY = Math.cos(flightY),
        sinY = Math.sin(flightY);
      // Ry(poseY) Rx(poseX) Rz(turn) Rx(flightX) Ry(flightY), in GL column order.
      writeNormalColumn(
        0,
        cosTurn * cosY - sinTurn * sinX * sinY,
        sinTurn * cosY + cosTurn * sinX * sinY,
        -cosX * sinY,
      );
      writeNormalColumn(1, -sinTurn * cosX, cosTurn * cosX, sinX);
      writeNormalColumn(
        2,
        cosTurn * sinY + sinTurn * sinX * cosY,
        sinTurn * sinY - cosTurn * sinX * cosY,
        cosX * cosY,
      );
      gl.uniformMatrix3fv(this.uniforms.get("normalTransform") ?? null, false, normalTransform);
      gl.uniform2f(this.uniforms.get("pointTurn") ?? null, cosTurn, sinTurn);
      gl.uniform1f(
        this.uniforms.get("roughness") ?? null,
        material?.finish === "matte" ? 0.16 : 0.016,
      );
      gl.uniform1f(this.uniforms.get("creaseReveal") ?? null, tile.creaseProgress);
      gl.uniform1f(this.uniforms.get("opaquePaper") ?? null, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (
        coverage &&
        (coverage.width !== coverage.sourceWidth || coverage.height !== coverage.sourceHeight)
      ) {
        // Overflow changes interpolator rounding in WebKit. Opaque paper uses its original
        // viewport and UV interpolation, overwriting only fully covered pixels in this same tile.
        const sourceWidth = tile.sourceW;
        const sourceHeight = tile.sourceH;
        const left = Math.round((-coverage.x * tile.w) / coverage.width);
        const top = Math.round((-coverage.y * tile.h) / coverage.height);
        gl.viewport(
          tile.x + left,
          gl.drawingBufferHeight - tile.y - top - sourceHeight,
          sourceWidth,
          sourceHeight,
        );
        gl.uniform4f(this.uniforms.get("sourceBounds") ?? null, 0, 0, 1, 1);
        gl.uniform1f(this.uniforms.get("opaquePaper") ?? null, 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }
    const submittedMs = recording ? performance.now() - submittedAt : 0;
    let firstCopyMs = 0;
    let remainingCopiesMs = 0;
    let copied = 0;
    // Finish every crop before the next batch overwrites the shared GL source. Native browsers
    // can reuse its unchanged snapshot; an extra full-size 2D atlas adds another copy and allocation.
    for (const { surface, x, y, w, h, target } of tiles) {
      const copyStartedAt = recording ? performance.now() : 0;
      const canvas = target ?? surface.flatSnapshot();
      surface.sizeOutput(canvas);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error(
          `The sticker snapshot 2D context for ${surface.options.print} is unavailable`,
        );
      context.globalCompositeOperation = "copy";
      context.drawImage(this.canvas, x, y, w, h, 0, 0, w, h);
      if (recording) {
        const elapsed = performance.now() - copyStartedAt;
        if (copied === 0) firstCopyMs = elapsed;
        else remainingCopiesMs += elapsed;
      }
      copied++;
      if (canvas === surface.canvas) {
        const previousNormal = surface.snapshotNormal;
        surface.hasSnapshot = true;
        surface.seededCopy = false;
        surface.snapshotNormal = surface.normalUrl;
        surface.snapshotNormalBounds = surface.normalBounds;
        surface.snapshotMaterial = surface.printCut?.identity;
        surface.snapshotOptions = {
          ...surface.options,
          print: surface.printCut?.print ?? surface.options.print,
          cut: surface.printCut?.cut ?? surface.options.cut,
          foil: surface.printCut?.foil?.description.material,
          finish: surface.printCut?.finish ?? surface.options.finish,
          normal: surface.normalUrl,
          normalBounds: surface.normalBounds,
        };
        surface.snapshotCoverageFrame = surface.printCut?.foil?.description.frame;
        const previousCoverage = surface.snapshotFoilCoverage;
        surface.showFoilCoverage(surface.printCut?.foil?.description);
        canvas.dataset.foil = surface.printCut?.foil ? "true" : "false";
        surface.snapshotPending = false;
        surface.renderFailed = false;
        if (canvas.dataset.state !== "ready") canvas.dataset.state = "ready";
        if (previousCoverage !== surface.snapshotFoilCoverage)
          for (const committed of surface.foilCommits) committed(surface.snapshotFoilCoverage);
        const reveal = surface.reveal;
        const normal = surface.normalUrl;
        // A completed normal consumes its placement even when no animation can be prepared.
        const started =
          normal !== undefined &&
          normal === surface.options.normal &&
          previousNormal !== normal &&
          surface.options.startCreaseReveal?.(normal) === true;
        if (reveal && !reveal.admitted) {
          if (started) reveal.admitted = true;
          else surface.finishCreaseReveal(normal === surface.options.normal);
        }
        if (surface.revealing) {
          surface.container.dataset.creaseReveal = "";
          surface.showCreaseProgress(surface.reveal?.progress ?? 0);
          this.reveal(surface);
        } else surface.showCreaseProgress(1);
        surface.settleWaiters();
      }
    }
    if (recording)
      notePerformance(
        "laminate-batch",
        `${tiles.length} ${tiles.length === 1 ? "tile" : "tiles"}; GL ${this.canvas.width}x${this.canvas.height}; used ${width}x${height}; submit ${submittedMs.toFixed(1)}ms; first copy ${firstCopyMs.toFixed(1)}ms; remaining copies ${remainingCopiesMs.toFixed(1)}ms`,
      );
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelTextureValidations("The shared sticker material renderer was destroyed");
    this.cancelRefresh();
    cancelAnimationFrame(this.revealFrame);
    this.revealFrame = 0;
    this.reveals.clear();
    this.stopLight();
    this.canvas.removeEventListener("webglcontextlost", this.contextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.contextRestored);
    this.reduced.removeEventListener("change", this.motionChanged);
    for (const entry of this.textures.values()) {
      entry.abort.abort();
      // All owners are already disposed or are reloading after context restoration.
      entry.texture.then(
        (texture) => {
          if (!this.lost) this.gl.deleteTexture(texture);
        },
        () => {},
      );
    }
    this.textures.clear();
    for (const [key, entry] of this.foils) {
      entry.users = 1;
      this.releaseFoil(key);
    }
    this.surfaces.clear();
    // Loss already destroyed these resources. Deleting invalid handles after restoration is an error.
    if (!this.lost) {
      this.gl.deleteTexture(this.flat);
      this.gl.deleteBuffer(this.buffer);
      this.gl.deleteProgram(this.program);
    }
    releaseCanvas(this.canvas);
    // Detach callbacks first so intentional retirement cannot report failure on the replacement.
    if (!this.gl.isContextLost()) this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

let renderer: StickerRenderer | null = null;
const mounted = new WeakMap<HTMLCanvasElement, MountedSurface>();
class MountedSurface {
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
  pendingNormal: {
    url?: string;
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
    this.pendingNormal = null;
    this.initialize();
  }
  /** What sizeOutput last wrote, so an unchanged output writes no styles. */
  readonly outputs = new WeakMap<
    HTMLCanvasElement,
    { coverage: object | undefined; wrapped: boolean }
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
      this.gpu = renderer ??= new StickerRenderer();
      this.gpu.surfaces.add(this);
      const gpu = this.gpu;
      if (gpu.textureValidationFailure) {
        this.failed(gpu.textureValidationFailure);
        return;
      }
      this.normalTexture = gpu.flat;
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
        this.textures = [printTexture, cutTexture, this.normalTexture ?? gpu.flat];
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
    if (
      !gpu ||
      gpu.disposed ||
      !this.live ||
      (this.pendingNormal &&
        this.pendingNormal.url === url &&
        JSON.stringify(this.pendingNormal.bounds) === JSON.stringify(this.options.normalBounds))
    )
      return;
    if (this.pendingNormal) {
      const old = this.pendingNormal;
      this.pendingNormal = null;
      if (old.url) old.gpu.release(old.url);
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
        this.normalUrl = undefined;
        this.normalBounds = undefined;
        this.normalTexture = gpu.flat;
        this.normalFailure = null;
        if (this.textures) this.textures[2] = gpu.flat;
        this.snapshotPending = true;
        this.renderFailed = false;
        if (old) gpu.release(old);
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
      gpu,
      bounds: this.options.normalBounds,
    };
    const normalBounds = this.options.normalBounds;
    this.renderFailed = false;
    this.normalFailure = null;
    this.pendingNormal = pending;
    gpu.acquire(url).then(
      (texture) => {
        if (!this.live || this.gpu !== gpu || gpu.disposed || this.pendingNormal !== pending)
          return;
        const changingMaterial =
          this.pendingPrintCut && this.pendingPrintCut.identity !== this.printCut?.identity;
        const geometryError = changingMaterial ? null : this.geometryError(url);
        if (geometryError) {
          this.pendingNormal = null;
          gpu.release(url);
          this.normalFailure = { url };
          this.loadError("normal", geometryError);
          return;
        }
        pending.commit = () => {
          this.pendingNormal = null;
          const old = this.normalUrl;
          this.normalUrl = url;
          this.normalBounds = normalBounds;
          this.normalTexture = texture;
          this.normalFailure = null;
          if (this.textures) this.textures[2] = texture;
          this.snapshotPending = true;
          if (old) gpu.release(old);
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
        gpu.release(url);
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
    if (this.pendingNormal?.url) this.pendingNormal.gpu.release(this.pendingNormal.url);
    this.normalUrl = undefined;
    this.normalBounds = undefined;
    this.normalTexture = null;
    this.pendingNormal = null;
    if (!gpu.surfaces.size) {
      gpu.destroy();
      if (renderer === gpu) renderer = null;
    }
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
  options: Pick<StickerSurface, "print" | "cut" | "normal" | "finish" | "foil" | "normalBounds">,
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
