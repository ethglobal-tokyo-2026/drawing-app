import { currentLight, subscribeLight } from "./light";
import { notePerformance, timeOurWork } from "../performance/performanceRecorder";
import { laminateFragment, laminateVertex } from "./laminateShader";
import { releaseCanvas } from "../ui/releaseCanvas";

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
  refreshFrame = 0;
  readonly flat: WebGLTexture;
  readonly buffer: WebGLBuffer;
  readonly atlasLimit: number;
  readonly stopLight: () => void = () => {};
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
      premultipliedAlpha: false,
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
    } catch (error) {
      // A constructor that throws never becomes the shared renderer; release its partial allocation.
      this.disposed = true;
      this.stopLight();
      this.canvas.removeEventListener("webglcontextlost", this.contextLost);
      this.canvas.removeEventListener("webglcontextrestored", this.contextRestored);
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

  draw(surfaces: MountedSurface[]) {
    if (this.disposed || this.lost || document.hidden) return;
    // Read geometry together before snapshots change, avoiding a layout read after each write.
    const jobs = surfaces.flatMap((surface) => {
      const { canvas } = surface;
      if (
        !surface.textures ||
        (!surface.hasSnapshot && surface.pendingNormal) ||
        !canvas.isConnected ||
        (surface.options.active && !surface.options.active())
      )
        return [];
      const box = canvas.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth)
        return [];
      const width = canvas.clientWidth,
        height = canvas.clientHeight;
      if (!width || !height) return [];
      const ratio = Math.min(devicePixelRatio || 1, 2, 1024 / Math.max(width, height));
      return [
        {
          surface,
          width,
          height,
          w: Math.max(1, Math.round(width * ratio)),
          h: Math.max(1, Math.round(height * ratio)),
          x: 0,
          y: 0,
        },
      ];
    });
    type Tile = (typeof jobs)[number];
    const limit = this.atlasLimit;
    let tiles: Tile[] = [],
      x = 0,
      y = 0,
      row = 0;
    const flush = () => {
      if (!tiles.length) return;
      try {
        this.drawTiles(tiles);
      } catch (error) {
        for (const tile of tiles) tile.surface.failed(String(error));
      }
      tiles = [];
      x = y = row = 0;
    };
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
  }

  drawTiles(
    tiles: {
      surface: MountedSurface;
      width: number;
      height: number;
      w: number;
      h: number;
      x: number;
      y: number;
    }[],
  ) {
    const width = Math.max(...tiles.map((tile) => tile.x + tile.w));
    const height = Math.max(...tiles.map((tile) => tile.y + tile.h));
    // A single-surface load or turn must not shrink the next shared batch's allocation.
    if (this.canvas.width < width) this.canvas.width = width;
    if (this.canvas.height < height) this.canvas.height = height;
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
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    if (this.atlas.width < width) this.atlas.width = width;
    if (this.atlas.height < height) this.atlas.height = height;
    const atlas = this.atlas.getContext("2d");
    if (!atlas) throw new Error("The laminate atlas 2D context is unavailable");
    atlas.globalCompositeOperation = "copy";
    // One GPU-to-2D copy for this bounded batch, then ordinary 2D region copies.
    atlas.drawImage(this.canvas, 0, 0, width, height, 0, 0, width, height);
    for (const { surface, x, y, w, h } of tiles) {
      const { canvas } = surface;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The sticker snapshot 2D context is unavailable");
      context.globalCompositeOperation = "copy";
      context.drawImage(this.atlas, x, y, w, h, 0, 0, w, h);
      surface.hasSnapshot = true;
      if (canvas.dataset.state !== "ready") canvas.dataset.state = "ready";
    }
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelRefresh();
    this.stopLight();
    this.canvas.removeEventListener("webglcontextlost", this.contextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.contextRestored);
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
  printCut: { print: string; cut: string; textures: [WebGLTexture, WebGLTexture] } | null = null;
  pendingPrintCut: { print: string; cut: string; gpu: LaminateRenderer } | null = null;
  printCutError: string | null = null;
  normalError: string | null = null;
  normalUrl?: string;
  normalTexture: WebGLTexture | null = null;
  pendingNormal: { url: string; gpu: LaminateRenderer } | null = null;
  live = true;
  readonly canvas: HTMLCanvasElement;
  readonly options: LaminateSurface;
  constructor(canvas: HTMLCanvasElement, options: LaminateSurface) {
    this.canvas = canvas;
    this.options = options;
    this.reload();
  }
  reload() {
    if (!this.live) return;
    this.textures = null;
    this.hasSnapshot = false;
    this.printCut = null;
    this.pendingPrintCut = null;
    this.printCutError = this.normalError = null;
    delete this.canvas.dataset.error;
    this.normalUrl = undefined;
    this.normalTexture = null;
    this.pendingNormal = null;
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
    this.canvas.dataset.state = "failed";
    this.canvas.dataset.error = why;
    console.error(`Rendering sticker laminate for ${this.options.print} failed: ${why}`);
    notePerformance("laminate", why);
  }
  loadError(kind: "printCut" | "normal", why: string | null) {
    if (kind === "printCut") this.printCutError = why;
    else this.normalError = why;
    const errors = [this.printCutError, this.normalError].filter(Boolean).join("; ");
    if (errors) this.canvas.dataset.error = errors;
    else delete this.canvas.dataset.error;
    if (why) {
      console.error(`Rendering sticker laminate for ${this.options.print} failed: ${why}`);
      notePerformance("laminate", why);
    }
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
    this.pendingPrintCut = pending;
    Promise.all([gpu.acquire(print), gpu.acquire(cut)]).then(
      ([printTexture, cutTexture]) => {
        if (!this.live || this.gpu !== gpu || gpu.disposed || this.pendingPrintCut !== pending)
          return;
        this.pendingPrintCut = null;
        const old = this.printCut;
        this.printCut = { print, cut, textures: [printTexture, cutTexture] };
        this.textures = [printTexture, cutTexture, this.normalTexture ?? gpu.flat];
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
      this.loadError("normal", null);
      if (!this.hasSnapshot) this.draw();
      return;
    }
    if (!url) {
      const old = this.normalUrl;
      this.normalUrl = undefined;
      this.normalTexture = gpu.flat;
      if (this.textures) this.textures[2] = gpu.flat;
      if (old) gpu.release(old);
      this.loadError("normal", null);
      this.draw();
      return;
    }
    const pending = { url, gpu };
    this.pendingNormal = pending;
    gpu.acquire(url).then(
      (texture) => {
        if (!this.live || this.gpu !== gpu || gpu.disposed || this.pendingNormal !== pending)
          return;
        this.pendingNormal = null;
        const old = this.normalUrl;
        this.normalUrl = url;
        this.normalTexture = texture;
        if (this.textures) this.textures[2] = texture;
        if (old) gpu.release(old);
        this.loadError("normal", null);
        this.draw();
      },
      (error: unknown) => {
        // Canceled generations have released their ownership; only the current request reports failure.
        if (!this.live || this.gpu !== gpu || gpu.disposed || this.pendingNormal !== pending)
          return;
        this.pendingNormal = null;
        gpu.release(url);
        const why = `Replacing crease normal ${url} failed: ${String(error)}`;
        // Keep the ready laminate visible; its last normal remains valid after a failed rebake.
        this.loadError("normal", why);
        if (!this.hasSnapshot) this.draw();
      },
    );
  }
  draw() {
    if (!this.textures) return;
    this.gpu?.refresh(this);
  }
  release() {
    if (!this.live) return;
    this.live = false;
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
  Object.assign(surface.options, options);
  surface.replacePrintCut(options.print, options.cut);
  surface.replaceNormal(options.normal);
  if (finishChanged) surface.draw();
}

/** Board gestures and finite flights change the surface geometry under the held light. */
export function turnLaminate(canvas: HTMLCanvasElement, turn: number, tiltX = 0, tiltY = 0) {
  const surface = mounted.get(canvas);
  if (
    !surface ||
    (surface.options.turn === turn &&
      surface.options.tiltX === tiltX &&
      surface.options.tiltY === tiltY)
  )
    return;
  Object.assign(surface.options, { turn, tiltX, tiltY });
  surface.draw();
}

/** An exposed tray face samples the held pose after spending time inside the closed tray. */
export function refreshLaminate(canvas: HTMLCanvasElement) {
  const surface = mounted.get(canvas);
  if (surface) surface.gpu?.refresh(surface);
}
