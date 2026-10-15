import { createFoilLookup, FOIL_STYLES, type Rgb } from "./foilMaterial";
import { roomIrradianceSources } from "./roomIrradiance";
import { roomFoilSources, roomFrame } from "./sharedRoom";
import {
  acquireFoilCoverage,
  FOIL_COVERAGE_TIMEOUT_MS,
  type SharedFoilCoverage,
} from "./acquireFoilCoverage";
import { stickerFoilColors, type StickerFoilMaterial } from "./stickerFoilMaterial";
import { LAMINATE_FINISHES } from "./laminate";
import { subscribeLight } from "./light";
import {
  isPerformanceRecorderOn,
  notePerformance,
  timeOurWork,
} from "../performance/performanceRecorder";
import { stickerFragment, stickerVertex } from "./stickerShader";
import { releaseCanvas } from "../ui/releaseCanvas";
import { REDUCED_MOTION } from "../ui/useReducedMotion";
import { setCreaseRevealSize } from "./creaseRevealSize";
import type { MountedSurface, StickerFoilCoverage } from "./stickerRenderer";

/** Image uploads share one later task; no individual upload immediately queries GPU errors. */
const TEXTURE_VALIDATION_DELAY_MS = 16;
const TEXTURE_VALIDATION_TIMEOUT_MS = 20_000;
/** How long fetching and decoding one image may take. */
const TEXTURE_LOAD_TIMEOUT_MS = 20_000;
/** A failed check drains the finite WebGL error flags before another upload batch can proceed. */
const MAX_TEXTURE_ERROR_CHECKS = 8;
/** A scroller quiet this long has stopped; its surfaces then reflect the room from their new spots. */
const SCROLL_SETTLE_MS = 120;

interface TextureValidation {
  url: string;
  finish: (failure?: string) => void;
}

type FoilLookup = ReturnType<typeof createFoilLookup>;
export type FoilResources = {
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
/** One GPU context computes the coating; each visible sticker keeps its own 2D snapshot. */
export class StickerRenderer {
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
  /** Surfaces moving on screen, redrawn every frame until each of their motions ends. */
  readonly following = new Map<MountedSurface, number>();
  readonly reveals = new Set<MountedSurface>();
  /** Scrollers that moved since they last stopped. */
  readonly scrollers = new Set<EventTarget>();
  scrollTimer = 0;
  readonly scrolled = (event: Event) => {
    if (event.target) this.scrollers.add(event.target);
    window.clearTimeout(this.scrollTimer);
    this.scrollTimer = window.setTimeout(this.scrollStopped, SCROLL_SETTLE_MS);
  };
  readonly scrollStopped = () => {
    this.scrollTimer = 0;
    const scrollers = [...this.scrollers];
    this.scrollers.clear();
    for (const surface of this.surfaces)
      if (
        scrollers.some(
          (scroller) =>
            scroller === document ||
            (scroller instanceof Node && scroller.contains(surface.container)),
        )
      )
        this.refresh(surface);
  };
  /** A resize or turned screen moves every surface relative to the screen's center. */
  readonly resized = () => {
    for (const surface of this.surfaces) this.refresh(surface);
  };
  readonly textureValidations = new Set<TextureValidation>();
  textureValidationTimer = 0;
  /** An undrained or unreadable error state cannot be used for later uploads or snapshots. */
  textureValidationFailure: string | null = null;
  refreshFrame = 0;
  revealFrame = 0;
  readonly flat: WebGLTexture;
  /** The holo foil's palette in sRGB, read once, for the glitter and prism laminates. */
  laminatePalette: Float32Array | null = null;
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
        "laminateStyle",
        "laminatePalette[0]",
        "screenCenter",
        "screenScale",
        "roomUp",
        "roomToward",
        "roomEye",
        "roomLight",
        "roomAcross",
        "roomDown",
        "irradianceSources[0]",
        "roomLights[0]",
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
          this.scheduleRefresh();
        }),
      );
      this.canvas.addEventListener("webglcontextlost", this.contextLost);
      this.canvas.addEventListener("webglcontextrestored", this.contextRestored);
      this.reduced.addEventListener("change", this.motionChanged);
      // Scroll events don't bubble; capturing them at the document hears every scroller.
      document.addEventListener("scroll", this.scrolled, { capture: true, passive: true });
      window.addEventListener("resize", this.resized);
      screen.orientation?.addEventListener("change", this.resized);
    } catch (error) {
      // A constructor that throws never becomes the shared renderer; release its partial allocation.
      // Each release runs on its own, and one that fails is logged: the first error says why.
      this.disposed = true;
      for (const release of [
        () => this.stopLight(),
        () => this.stopListening(),
        () => {
          if (!gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
        },
        () => releaseCanvas(this.canvas),
      ])
        try {
          release();
        } catch (cleanup) {
          console.error(
            "Releasing a sticker material renderer that failed to start failed",
            cleanup,
          );
        }
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
    this.scheduleRefresh();
  }

  /** One draw per frame takes every requested surface and every one still moving. */
  scheduleRefresh() {
    if (this.refreshFrame || (!this.refreshes.size && !this.following.size)) return;
    if (this.disposed || this.lost || this.textureValidationFailure) return;
    this.refreshFrame = requestAnimationFrame(() => {
      this.refreshFrame = 0;
      const surfaces = new Set([...this.refreshes, ...this.following.keys()]);
      this.refreshes.clear();
      timeOurWork("laminate", () => this.draw([...surfaces]));
      this.scheduleRefresh();
    });
  }

  /** Redraws `surface` every frame until `motion` settles, as it moves on screen under a held pose. */
  follow(surface: MountedSurface, motion: Promise<unknown>) {
    if (this.disposed || this.lost) return;
    this.following.set(surface, (this.following.get(surface) ?? 0) + 1);
    this.scheduleRefresh();
    const stop = () => {
      const left = (this.following.get(surface) ?? 0) - 1;
      if (left > 0) this.following.set(surface, left);
      else if (this.following.delete(surface)) this.refresh(surface);
    };
    motion.then(stop, stop);
  }

  cancelRefresh() {
    cancelAnimationFrame(this.refreshFrame);
    this.refreshFrame = 0;
    this.refreshes.clear();
  }

  stopListening() {
    this.canvas.removeEventListener("webglcontextlost", this.contextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.contextRestored);
    this.reduced.removeEventListener("change", this.motionChanged);
    document.removeEventListener("scroll", this.scrolled, { capture: true });
    window.removeEventListener("resize", this.resized);
    screen.orientation?.removeEventListener("change", this.resized);
    window.clearTimeout(this.scrollTimer);
    this.scrollTimer = 0;
    this.scrollers.clear();
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
    const drawnAt = isPerformanceRecorderOn() ? performance.now() : 0;
    // A standalone canvas wears its overflow before its first snapshot, so every draw measures it through
    // the same transform: WebKit resolves the transform's percentages against a pixel-snapped box.
    for (const surface of this.surfaces)
      if (surface.container === surface.canvas && !surface.hasSnapshot)
        surface.sizeOutput(surface.canvas);
    // Exposed owners reserve their geometry before assets arrive; partial requests only select draws.
    // Every surface's layout is read before anything else is written, so a frame forces one layout at most.
    const viewport = visualViewport;
    const screenWidth = innerWidth,
      screenHeight = innerHeight;
    const centerX = viewport ? viewport.offsetLeft + viewport.width / 2 : screenWidth / 2,
      centerY = viewport ? viewport.offsetTop + viewport.height / 2 : screenHeight / 2;
    const scene = [...this.surfaces].map((surface) => {
      if (!surface.canvas.isConnected || (surface.options.active && !surface.options.active()))
        return { surface, layout: null };
      const box = surface.container.getBoundingClientRect();
      if (box.bottom < 0 || box.top > screenHeight || box.right < 0 || box.left > screenWidth)
        return { surface, layout: null };
      const width = surface.container.clientWidth,
        height = surface.container.clientHeight;
      if (!width || !height) return { surface, layout: null };
      // The moving window keeps the unrounded local box, preserving the print's CSS sampling.
      const style = getComputedStyle(surface.container);
      return {
        surface,
        layout: {
          box,
          width,
          height,
          revealWidth: parseFloat(style.width),
          revealHeight: parseFloat(style.height),
          // A standalone canvas wears its overflow as its own scale and translate, which its box includes.
          overflow:
            surface.container === surface.canvas
              ? surface.outputs.get(surface.canvas)?.coverage
              : undefined,
        },
      };
    });
    const jobs = scene.flatMap(({ surface, layout }) => {
      if (!layout) {
        surface.finishCreaseReveal();
        return [];
      }
      const { box, width, height, overflow } = layout;
      // Where the sticker sits on screen and how large it shows there, for the one shared eye.
      // A turned box's bounds stay centered on it; their width gives its scale once the turn is known.
      // The source box is measured through any overflow it wears, so the light holds once it's applied.
      const boxWidth = overflow ? (width * overflow.width) / overflow.sourceWidth : width,
        boxHeight = overflow ? (height * overflow.height) / overflow.sourceHeight : height;
      const turned = (surface.options.turn * Math.PI) / 180;
      const cos = Math.abs(Math.cos(turned)),
        sin = Math.abs(Math.sin(turned));
      const onScreen =
        (box.width / (boxWidth * cos + boxHeight * sin) +
          box.height / (boxWidth * sin + boxHeight * cos)) /
        2;
      // Overflow grown unevenly moves the box's center off the source's, in the sticker's own axes.
      const offsetX = overflow
          ? (width * overflow.x) / overflow.sourceWidth + (boxWidth - width) / 2
          : 0,
        offsetY = overflow
          ? (height * overflow.y) / overflow.sourceHeight + (boxHeight - height) / 2
          : 0;
      const cosTurn = Math.cos(turned),
        sinTurn = Math.sin(turned);
      const screenX =
        (box.left + box.right) / 2 - onScreen * (offsetX * cosTurn - offsetY * sinTurn) - centerX;
      const screenY =
        (box.top + box.bottom) / 2 - onScreen * (offsetX * sinTurn + offsetY * cosTurn) - centerY;
      const screenScale = onScreen * Math.min(width, height);
      surface.resizeCoverage(width, height);
      const coverage = surface.printCut?.foil?.coverage;
      const outputWidth = coverage ? (width * coverage.width) / coverage.sourceWidth : width;
      const outputHeight = coverage ? (height * coverage.height) / coverage.sourceHeight : height;
      const ratio = Math.min(devicePixelRatio || 1, 2, 1024 / Math.max(width, height));
      // A revealing crease's flat snapshot has no canvas of its own until its copy.
      const target: HTMLCanvasElement | null = surface.canvas;
      const job = {
        surface,
        width,
        height,
        revealWidth: layout.revealWidth,
        revealHeight: layout.revealHeight,
        sourceW: Math.max(1, Math.round(width * ratio)),
        sourceH: Math.max(1, Math.round(height * ratio)),
        w: Math.max(1, Math.round(outputWidth * ratio)),
        h: Math.max(1, Math.round(outputHeight * ratio)),
        x: 0,
        y: 0,
        screenX,
        screenY,
        screenScale,
        target,
        flat: false,
      };
      return [job];
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
    // The shaders' derivatives come from 2×2 pixel quads, so a tile's pixels change with the parity
    // of where it lands. Even origins give a sticker the same quads in any batch.
    const even = (size: number) => size + (size & 1);
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
      x += even(job.w);
      row = Math.max(row, even(job.h));
    }
    flush();
    const laidOutMs = drawnAt ? performance.now() - drawnAt : 0;
    const requested = new Set(surfaces);
    // A revealing crease's flat snapshot takes its sticker's own tile, in a batch of its own drawn first,
    // so a reveal moves no tile. WebKit still gives a tile slightly different pixels at another place in
    // the atlas, even an even one, and a revealed sticker would keep pixels its next draw doesn't match.
    const draws = batches.flatMap((batch) => {
      const drawn = batch.filter(
        ({ surface }) =>
          requested.has(surface) &&
          surface.textures &&
          (surface.hasSnapshot || !surface.pendingNormal) &&
          !(surface.seededCopy && surface.options.normal !== surface.normalUrl) &&
          !(surface.revealing && surface.pendingPrintCut),
      );
      const flats = drawn.flatMap((job) =>
        job.surface.revealing ? [{ ...job, target: null, flat: true }] : [],
      );
      return [flats, drawn].filter((tiles) => tiles.length);
    });
    if (!draws.length) return;
    const width = Math.max(...jobs.map((tile) => tile.x + tile.w));
    // GL counts viewport rows up from the bottom, so an even height keeps those origins' parity too.
    const height = even(Math.max(...jobs.map((tile) => tile.y + tile.h)));
    try {
      // Scene changes may shrink storage; turns and texture arrivals keep the complete scene size.
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;
    } catch (error) {
      for (const batch of draws) for (const { surface } of batch) surface.failed(String(error));
      return;
    }
    for (const [index, batch] of draws.entries()) {
      try {
        // The draw reads every surface's layout once, so its first batch's note carries that time.
        this.drawTiles(batch, index === 0 ? laidOutMs : 0);
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
      flat: boolean;
      target: HTMLCanvasElement | null;
      x: number;
      y: number;
      screenX: number;
      screenY: number;
      screenScale: number;
    }[],
    laidOutMs = 0,
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
    // The room holds still in the world as the device turns; normals stay fixed to the sticker.
    const room = roomFrame();
    gl.uniform3fv(this.uniforms.get("roomUp") ?? null, room.up);
    gl.uniform3fv(this.uniforms.get("roomToward") ?? null, room.toward);
    gl.uniform3fv(this.uniforms.get("roomEye") ?? null, room.eye);
    gl.uniform3fv(this.uniforms.get("roomLight") ?? null, room.light);
    gl.uniform3fv(this.uniforms.get("roomAcross") ?? null, room.across);
    gl.uniform3fv(this.uniforms.get("roomDown") ?? null, room.down);
    gl.uniform4fv(this.uniforms.get("irradianceSources[0]") ?? null, roomIrradianceSources(room));
    gl.uniform3fv(
      this.uniforms.get("roomLights[0]") ?? null,
      room.lights.flatMap((source) => source.direction),
    );
    const foilSources = roomFoilSources(room);
    const normalTransform = this.normalTransform;
    const writeNormalColumn = (column: number, x: number, y: number, z: number) => {
      normalTransform[column * 3] = x;
      normalTransform[column * 3 + 1] = y;
      normalTransform[column * 3 + 2] = z;
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
        // A crease's flat snapshot takes the normal of a sticker without one, so it has exactly that
        // sticker's pixels: a normal decoded any other way can differ by a byte under a soft glare.
        gl.bindTexture(gl.TEXTURE_2D, i === 2 && tile.flat ? this.flat : textures[i]);
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
      gl.uniform2f(this.uniforms.get("screenCenter") ?? null, tile.screenX, tile.screenY);
      gl.uniform1f(this.uniforms.get("screenScale") ?? null, tile.screenScale);
      const turn = (options.turn * Math.PI) / 180,
        flightX = ((options.tiltX ?? 0) * Math.PI) / 180,
        flightY = ((options.tiltY ?? 0) * Math.PI) / 180;
      const cosTurn = Math.cos(turn),
        sinTurn = Math.sin(turn),
        cosX = Math.cos(flightX),
        sinX = Math.sin(flightX),
        cosY = Math.cos(flightY),
        sinY = Math.sin(flightY);
      // Rz(turn) Rx(flightX) Ry(flightY), in GL column order; the device's pose turns the room instead.
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
        material?.finish === "matte" ? 0.16 : 0.002,
      );
      const laminate = material?.finish ?? "gloss";
      gl.uniform1f(this.uniforms.get("laminateStyle") ?? null, LAMINATE_FINISHES.indexOf(laminate));
      if (laminate === "glitter" || laminate === "prism") {
        this.laminatePalette ??= Float32Array.from(
          stickerFoilColors(tile.surface.container, {
            style: "holo",
            size: "detail",
          }).palette.flat(),
        );
        gl.uniform3fv(this.uniforms.get("laminatePalette[0]") ?? null, this.laminatePalette);
      }
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
    let copiesMs = 0;
    let afterCopiesMs = 0;
    let copied = 0;
    // Finish every crop before the next batch overwrites the shared GL source. Native browsers
    // can reuse its unchanged snapshot; an extra full-size 2D atlas adds another copy and allocation.
    // The first copy takes that snapshot, so on WebKit it also waits for the GPU to draw the batch.
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
      const copiedAt = recording ? performance.now() : 0;
      if (recording) {
        if (copied === 0) firstCopyMs = copiedAt - copyStartedAt;
        copiesMs += copiedAt - copyStartedAt;
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
      if (recording) afterCopiesMs += performance.now() - copiedAt;
    }
    if (recording)
      notePerformance(
        "laminate-batch",
        `${tiles.length} ${tiles.length === 1 ? "tile" : "tiles"}; GL ${this.canvas.width}x${this.canvas.height}; used ${width}x${height}; layout ${laidOutMs.toFixed(1)}ms; submit ${submittedMs.toFixed(1)}ms; copies ${copiesMs.toFixed(1)}ms, first ${firstCopyMs.toFixed(1)}ms; after copies ${afterCopiesMs.toFixed(1)}ms`,
      );
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelTextureValidations("The shared sticker material renderer was destroyed");
    this.cancelRefresh();
    this.following.clear();
    cancelAnimationFrame(this.revealFrame);
    this.revealFrame = 0;
    this.reveals.clear();
    this.stopLight();
    this.stopListening();
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

/** Exposed surfaces all draw through one renderer, made by the first exposure that finds none. */
export function sharedRenderer(): StickerRenderer {
  return (renderer ??= new StickerRenderer());
}

/** A destroyed renderer stops being the shared one, so the next exposure makes a new context. */
export function destroyRenderer(gpu: StickerRenderer) {
  gpu.destroy();
  if (renderer === gpu) renderer = null;
}
