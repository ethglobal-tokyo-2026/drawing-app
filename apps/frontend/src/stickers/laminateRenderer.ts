import { currentLight, subscribeLight } from "./light";
import {
  isPerformanceRecorderOn,
  notePerformance,
  timeOurWork,
} from "../performance/performanceRecorder";
import { laminateFragment, laminateVertex } from "./laminateShader";
import { releaseCanvas } from "../ui/releaseCanvas";
import { REDUCED_MOTION } from "../ui/useReducedMotion";
import { setCreaseRevealSize } from "./creaseRevealSize";

/** The same short set-down timing as a board sticker's press. */
const CREASE_REVEAL_MS = 220;

export type LaminateFinish = "gloss" | "matte";
export interface LaminateSurface {
  print: string;
  cut: string;
  normal?: string;
  turn: number;
  finish: LaminateFinish;
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

/** One GPU context computes the coating; each visible sticker keeps its own 2D snapshot. */
class LaminateRenderer {
  readonly canvas = document.createElement("canvas");
  readonly atlas = document.createElement("canvas");
  readonly uniforms = new Map<string, WebGLUniformLocation | null>();
  readonly normalTransform = new Float32Array(9);
  readonly gl: WebGLRenderingContext;
  readonly program: WebGLProgram;
  readonly textures = new Map<
    string,
    { users: number; texture: Promise<WebGLTexture>; abort: AbortController }
  >();
  readonly surfaces = new Set<MountedSurface>();
  readonly refreshes = new Set<MountedSurface>();
  readonly reveals = new Set<MountedSurface>();
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
    for (const surface of this.surfaces) surface.failed("The shared laminate GPU context was lost");
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
      const renderLimit: unknown = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      if (typeof renderLimit !== "number" || renderLimit < 1024)
        throw new Error("The laminate render buffer limit is unavailable or too small");
      this.atlasLimit = Math.min(2048, renderLimit);
      const shader = (kind: number, source: string) => {
        const result = gl.createShader(kind);
        if (!result) throw new Error("Allocating the laminate shader failed");
        gl.shaderSource(result, source);
        gl.compileShader(result);
        if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
          const message = gl.getShaderInfoLog(result);
          gl.deleteShader(result);
          throw new Error(`Compiling the laminate shader failed: ${message}`);
        }
        return result;
      };
      const vertex = shader(gl.VERTEX_SHADER, laminateVertex);
      const fragment = shader(gl.FRAGMENT_SHADER, laminateFragment);
      const program = gl.createProgram();
      if (!program) throw new Error("Allocating the laminate program failed");
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(`Linking the laminate program failed: ${gl.getProgramInfoLog(program)}`);
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
      ])
        this.uniforms.set(name, gl.getUniformLocation(program, name));
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error("Allocating laminate geometry failed");
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
      releaseCanvas(this.atlas);
      throw error;
    }
  }

  texture(source: TexImageSource | Uint8Array): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error("Allocating a laminate texture failed");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    if (source instanceof Uint8Array)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      gl.deleteTexture(texture);
      throw new Error(`Uploading a laminate texture failed (${error})`);
    }
    return texture;
  }

  acquire(url: string): Promise<WebGLTexture> {
    const old = this.textures.get(url);
    if (old) {
      old.users++;
      return old.texture;
    }
    const abort = new AbortController();
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(20_000)]);
    const texture = (async () => {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`Loading ${url} answered ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();
      try {
        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(() => {
            image.src = "";
            reject(new Error(`Decoding ${url} exceeded 20 seconds`));
          }, 20_000);
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
        const longest = Math.max(image.naturalWidth, image.naturalHeight);
        if (longest <= 1024) return this.texture(image);
        const scaled = document.createElement("canvas");
        scaled.width = Math.max(1, Math.round((image.naturalWidth * 1024) / longest));
        scaled.height = Math.max(1, Math.round((image.naturalHeight * 1024) / longest));
        try {
          const context = scaled.getContext("2d");
          if (!context) throw new Error(`Resizing ${url} failed: 2D context unavailable`);
          context.drawImage(image, 0, 0, scaled.width, scaled.height);
          return this.texture(scaled);
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
    if (this.disposed || this.lost) return;
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
    if (this.disposed || this.lost) return;
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
      // The moving window keeps the unrounded local box, preserving the print's CSS sampling.
      const style = getComputedStyle(surface.container);
      const ratio = Math.min(devicePixelRatio || 1, 2, 1024 / Math.max(width, height));
      const job = {
        surface,
        width,
        height,
        revealWidth: parseFloat(style.width),
        revealHeight: parseFloat(style.height),
        w: Math.max(1, Math.round(width * ratio)),
        h: Math.max(1, Math.round(height * ratio)),
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
      if (this.atlas.width !== width) this.atlas.width = width;
      if (this.atlas.height !== height) this.atlas.height = height;
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
      throw new Error("The laminate GPU drawing buffer is smaller than its requested batch");
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
      if (!textures) continue;
      setCreaseRevealSize(tile.surface.container, tile.revealWidth, tile.revealHeight);
      gl.viewport(tile.x, gl.drawingBufferHeight - tile.y - tile.h, tile.w, tile.h);
      for (let i = 0; i < 3; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, textures[i]);
        gl.uniform1i(this.uniforms.get(["printImage", "cutImage", "normalImage"][i]) ?? null, i);
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
        options.finish === "matte" ? 0.16 : 0.016,
      );
      gl.uniform1f(this.uniforms.get("creaseReveal") ?? null, tile.creaseProgress);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    const submittedMs = recording ? performance.now() - submittedAt : 0;
    const snapshotStartedAt = recording ? performance.now() : 0;
    const atlasContext = this.atlas.getContext("2d");
    if (!atlasContext) throw new Error("The laminate batch snapshot 2D context is unavailable");
    // Replace the used region, including transparent cuts; retained crops never read outside it.
    atlasContext.clearRect(0, 0, width, height);
    atlasContext.globalCompositeOperation = "source-over";
    atlasContext.drawImage(this.canvas, 0, 0, width, height, 0, 0, width, height);
    const snapshotMs = recording ? performance.now() - snapshotStartedAt : 0;
    let firstCopyMs = 0;
    let remainingCopiesMs = 0;
    let copied = 0;
    // One GPU-source copy follows every batch; retained stickers then crop the complete 2D stage.
    for (const { surface, x, y, w, h, target } of tiles) {
      const copyStartedAt = recording ? performance.now() : 0;
      const canvas = target ?? surface.flatSnapshot();
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The sticker snapshot 2D context is unavailable");
      context.globalCompositeOperation = "copy";
      context.drawImage(this.atlas, x, y, w, h, 0, 0, w, h);
      if (recording) {
        const elapsed = performance.now() - copyStartedAt;
        if (copied === 0) firstCopyMs = elapsed;
        else remainingCopiesMs += elapsed;
      }
      copied++;
      if (canvas === surface.canvas) {
        const previousNormal = surface.snapshotNormal;
        surface.hasSnapshot = true;
        surface.snapshotNormal = surface.normalUrl;
        surface.snapshotPending = false;
        surface.renderFailed = false;
        if (canvas.dataset.state !== "ready") canvas.dataset.state = "ready";
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
        `${tiles.length} ${tiles.length === 1 ? "tile" : "tiles"}; GL ${this.canvas.width}x${this.canvas.height}; used ${width}x${height}; submit ${submittedMs.toFixed(1)}ms; snapshot ${snapshotMs.toFixed(1)}ms; first copy ${firstCopyMs.toFixed(1)}ms; remaining copies ${remainingCopiesMs.toFixed(1)}ms`,
      );
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
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
    this.surfaces.clear();
    // Loss already destroyed these resources. Deleting invalid handles after restoration is an error.
    if (!this.lost) {
      this.gl.deleteTexture(this.flat);
      this.gl.deleteBuffer(this.buffer);
      this.gl.deleteProgram(this.program);
    }
    releaseCanvas(this.canvas);
    releaseCanvas(this.atlas);
    // Detach callbacks first so intentional retirement cannot report failure on the replacement.
    if (!this.gl.isContextLost()) this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

let renderer: LaminateRenderer | null = null;
const mounted = new WeakMap<HTMLCanvasElement, MountedSurface>();
class MountedSurface {
  gpu: LaminateRenderer | null = null;
  textures: WebGLTexture[] | null = null;
  hasSnapshot = false;
  snapshotNormal?: string;
  snapshotPending = false;
  renderFailed = false;
  initializationAttempted = false;
  materialUpdating = false;
  readonly waiters = new Set<{
    expected?: { normal?: string };
    finish: () => void;
  }>();
  printCut: { print: string; cut: string; textures: [WebGLTexture, WebGLTexture] } | null = null;
  pendingPrintCut: { print: string; cut: string; gpu: LaminateRenderer } | null = null;
  printCutError: string | null = null;
  normalError: string | null = null;
  normalFailure: { url: string } | null = null;
  normalUrl?: string;
  normalTexture: WebGLTexture | null = null;
  pendingNormal: { url: string; gpu: LaminateRenderer } | null = null;
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
  readonly options: LaminateSurface;
  constructor(canvas: HTMLCanvasElement, options: LaminateSurface) {
    this.canvas = canvas;
    const container = canvas.closest(".sticker-laminate-surface");
    this.container = container instanceof HTMLElement ? container : canvas;
    this.options = options;
    this.reload();
  }
  reload() {
    if (!this.live) return;
    this.textures = null;
    this.hasSnapshot = false;
    this.snapshotNormal = undefined;
    this.snapshotPending = false;
    this.renderFailed = false;
    this.initializationAttempted = false;
    this.gpu = null;
    this.printCut = null;
    this.pendingPrintCut = null;
    this.printCutError = this.normalError = null;
    this.normalFailure = null;
    delete this.canvas.dataset.error;
    this.normalUrl = undefined;
    this.normalTexture = null;
    this.pendingNormal = null;
    this.initialize();
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
      this.gpu = renderer ??= new LaminateRenderer();
      this.gpu.surfaces.add(this);
      const gpu = this.gpu;
      this.normalTexture = gpu.flat;
      this.replaceNormal(this.options.normal);
      this.replacePrintCut(this.options.print, this.options.cut);
    } catch (error) {
      this.failed(String(error));
    }
  }
  failed(why: string) {
    this.finishCreaseReveal();
    this.renderFailed = true;
    this.canvas.dataset.state = "failed";
    this.canvas.dataset.error = why;
    console.error(`Rendering sticker laminate for ${this.options.print} failed: ${why}`);
    notePerformance("laminate", why);
    this.settleWaiters();
  }
  loadError(kind: "printCut" | "normal", why: string | null) {
    if (kind === "printCut") this.printCutError = why;
    else this.normalError = why;
    const errors = [this.printCutError, this.normalError].filter(Boolean).join("; ");
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
      console.error(`Rendering sticker laminate for ${this.options.print} failed: ${why}`);
      notePerformance("laminate", why);
      // A failed print upgrade can unblock a ready normal over the retained print and cut.
      if (completesReadyReveal) this.draw();
    }
    this.settleWaiters();
  }
  /** A retained bitmap is settled only after its current requested material has reached it. */
  settled(expected?: { normal?: string }) {
    if (this.materialUpdating) return false;
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
  /** A sharp print replaces its cut with it, while the previous complete sticker remains visible. */
  replacePrintCut(print: string, cut: string) {
    const gpu = this.gpu;
    if (
      !gpu ||
      gpu.disposed ||
      !this.live ||
      (this.pendingPrintCut?.print === print && this.pendingPrintCut.cut === cut)
    )
      return;
    if (this.pendingPrintCut) {
      const old = this.pendingPrintCut;
      this.pendingPrintCut = null;
      old.gpu.release(old.print);
      old.gpu.release(old.cut);
    }
    if (this.printCut?.print === print && this.printCut.cut === cut) {
      this.loadError("printCut", null);
      return;
    }
    const pending = { print, cut, gpu };
    this.renderFailed = false;
    this.pendingPrintCut = pending;
    Promise.all([gpu.acquire(print), gpu.acquire(cut)]).then(
      ([printTexture, cutTexture]) => {
        if (!this.live || this.gpu !== gpu || gpu.disposed || this.pendingPrintCut !== pending)
          return;
        this.pendingPrintCut = null;
        const old = this.printCut;
        this.printCut = { print, cut, textures: [printTexture, cutTexture] };
        this.textures = [printTexture, cutTexture, this.normalTexture ?? gpu.flat];
        this.snapshotPending = true;
        if (old) {
          gpu.release(old.print);
          gpu.release(old.cut);
        }
        this.loadError("printCut", null);
        this.draw();
      },
      (error: unknown) => {
        // Canceled generations already released their refs; the current pair alone reports failure.
        if (!this.live || this.gpu !== gpu || gpu.disposed || this.pendingPrintCut !== pending)
          return;
        this.pendingPrintCut = null;
        gpu.release(print);
        gpu.release(cut);
        const why = `Replacing sticker print and cut (${print}, ${cut}) failed: ${String(error)}`;
        if (!this.hasSnapshot) this.canvas.dataset.state = "failed";
        this.loadError("printCut", why);
      },
    );
  }
  /** A crease rebake keeps its last ready snapshot until the replacement normal is uploaded. */
  replaceNormal(url?: string) {
    const gpu = this.gpu;
    if (
      !gpu ||
      gpu.disposed ||
      !this.live ||
      (this.pendingNormal && this.pendingNormal.url === url)
    )
      return;
    if (this.pendingNormal) {
      const old = this.pendingNormal;
      this.pendingNormal = null;
      old.gpu.release(old.url);
    }
    if (this.normalUrl === url) {
      this.normalFailure = null;
      this.loadError("normal", null);
      this.showCreaseProgress(this.reveal?.progress ?? 1);
      if (!this.hasSnapshot) this.draw();
      return;
    }
    if (!url) {
      this.finishCreaseReveal();
      const old = this.normalUrl;
      this.normalUrl = undefined;
      this.normalTexture = gpu.flat;
      this.normalFailure = null;
      if (this.textures) this.textures[2] = gpu.flat;
      this.snapshotPending = true;
      this.renderFailed = false;
      if (old) gpu.release(old);
      this.loadError("normal", null);
      this.draw();
      return;
    }
    const pending = { url, gpu };
    this.renderFailed = false;
    this.normalFailure = null;
    this.pendingNormal = pending;
    gpu.acquire(url).then(
      (texture) => {
        if (!this.live || this.gpu !== gpu || gpu.disposed || this.pendingNormal !== pending)
          return;
        this.pendingNormal = null;
        const old = this.normalUrl;
        this.normalUrl = url;
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
        if (!this.hasSnapshot) this.draw();
      },
    );
  }
  draw() {
    this.initialize();
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
      this.flat.className = "sticker-laminate-flat";
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
    reveal.progress = 1 - (1 - time) ** 3;
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
      if (showPaint) this.options.onCreaseProgress?.(normal, 1);
    }
  }
  release() {
    if (!this.live) return;
    this.live = false;
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
    }
    if (this.pendingPrintCut) {
      this.pendingPrintCut.gpu.release(this.pendingPrintCut.print);
      this.pendingPrintCut.gpu.release(this.pendingPrintCut.cut);
    }
    this.printCut = null;
    this.pendingPrintCut = null;
    if (this.normalUrl) gpu.release(this.normalUrl);
    if (this.pendingNormal) this.pendingNormal.gpu.release(this.pendingNormal.url);
    this.normalUrl = undefined;
    this.normalTexture = null;
    this.pendingNormal = null;
    if (!gpu.surfaces.size) {
      gpu.destroy();
      if (renderer === gpu) renderer = null;
    }
  }
}

/** A snapshot only changes after a published tilt, resize, load, or explicit container turn. */
export function mountLaminate(canvas: HTMLCanvasElement, options: LaminateSurface): () => void {
  // A reused React canvas can still say ready after its old snapshot was released.
  canvas.dataset.state = "loading";
  delete canvas.dataset.error;
  const surface = new MountedSurface(canvas, options);
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
export function laminateTurn(canvas: HTMLCanvasElement): number | undefined {
  return mounted.get(canvas)?.options.turn;
}

/** Material changes preserve the print, cut and ready snapshot owned by this surface. */
export function updateLaminate(
  canvas: HTMLCanvasElement,
  options: Pick<LaminateSurface, "print" | "cut" | "normal" | "finish">,
) {
  const surface = mounted.get(canvas);
  if (!surface) return;
  const finishChanged = surface.options.finish !== options.finish;
  surface.materialUpdating = true;
  try {
    Object.assign(surface.options, options);
    // Deferred admission has no GPU yet; only a failure releases the matching fallback paint.
    if (surface.renderFailed || surface.gpu?.disposed || surface.gpu?.lost)
      surface.finishCreaseReveal();
    surface.replacePrintCut(options.print, options.cut);
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
export function turnLaminate(canvas: HTMLCanvasElement, turn: number, tiltX = 0, tiltY = 0) {
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
export function refreshLaminate(canvas: HTMLCanvasElement) {
  const surface = mounted.get(canvas);
  surface?.draw();
}

/** Waits for current material, or a baseline normal on retained print; never starts a covered surface. */
export function whenLaminateSettled(
  canvas: HTMLCanvasElement,
  expected?: { normal?: string },
  signal?: AbortSignal,
): Promise<void> {
  return mounted.get(canvas)?.whenSettled(expected, signal) ?? Promise.resolve();
}
