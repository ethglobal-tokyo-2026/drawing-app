import type { FoilCoverage } from "./foilCoverage";
import type { FoilCoverageReply, FoilCoverageRequest } from "./foilCoverageWorker";
import { type StickerFoilMaterial } from "./stickerFoilMaterial";

/** Coverage as the worker answers it: a grown band also brings its encoded static mask. */
export type FoilCoverageImage = FoilCoverage & { png?: Blob };

type Waiting = { resolve: (value: FoilCoverageImage) => void; reject: (error: unknown) => void };
const waiting = new Map<number, Waiting>();
let worker: Worker | null = null;
let nextJob = 0;

function coverageWorker() {
  if (worker) return worker;
  const started = new Worker(new URL("./foilCoverageWorker.ts", import.meta.url), {
    type: "module",
  });
  // Every waiting job belongs to the dropped worker; the next request starts a fresh one.
  const drop = (why: string) => {
    if (worker === started) worker = null;
    started.terminate();
    const failed = [...waiting.values()];
    waiting.clear();
    for (const job of failed) job.reject(new Error(why));
  };
  started.onmessage = ({ data }: MessageEvent<FoilCoverageReply>) => {
    const job = waiting.get(data.id);
    if (!job) return;
    waiting.delete(data.id);
    if (data.ok) job.resolve({ ...data.coverage, png: data.png });
    else job.reject(new Error(data.error));
  };
  started.onerror = (event) => drop(`The foil coverage worker failed: ${event.message}`);
  started.onmessageerror = () => drop("The foil coverage worker's answer couldn't be read");
  worker = started;
  return started;
}

/** createImageBitmap can't decode SVG, which only the fixtures use; a document decodes it instead. */
const needsDocument = (url: URL) =>
  url.protocol === "data:"
    ? /^data:image\/svg\+xml[;,]/i.test(url.href)
    : /\.svg$/i.test(url.pathname);

async function decodeInDocument(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Loading outer coverage ${url} answered ${response.status}`);
  const objectUrl = URL.createObjectURL(await response.blob());
  const image = new Image();
  try {
    image.src = objectUrl;
    await image.decode();
    signal.throwIfAborted();
    return await createImageBitmap(image);
  } catch (error) {
    signal.throwIfAborted();
    throw new Error(`Decoding outer coverage ${url} failed: ${String(error)}`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * The cut grown by `grow` (shares of the frame's width and height), or the baked mask when that's
 * zero, drawn for a tile `side` device px long. Decoding, growth and encoding run in the worker.
 */
export async function foilCoverageImage(
  cut: string,
  material: StickerFoilMaterial,
  side: number,
  grow: readonly [number, number],
  signal: AbortSignal,
): Promise<FoilCoverageImage> {
  signal.throwIfAborted();
  const baked = material.style !== "kyoto-seika" && material.mask;
  const url = new URL(baked || cut, document.baseURI);
  const bitmap = needsDocument(url) ? await decodeInDocument(url.href, signal) : undefined;
  return new Promise<FoilCoverageImage>((resolve, reject) => {
    const id = ++nextJob;
    const cancel = () => {
      if (!waiting.delete(id)) return;
      worker?.postMessage({ cancel: id } satisfies FoilCoverageRequest);
      reject(signal.reason);
    };
    const end = () => signal.removeEventListener("abort", cancel);
    waiting.set(id, {
      resolve: (value) => {
        end();
        resolve(value);
      },
      reject: (error) => {
        end();
        reject(error);
      },
    });
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) {
      bitmap?.close();
      cancel();
      return;
    }
    const request: FoilCoverageRequest = {
      job: {
        id,
        url: url.href,
        bitmap,
        side,
        grow,
        copies: material.style === "kyoto-seika" ? 8 : 16,
      },
    };
    try {
      coverageWorker().postMessage(request, bitmap ? [bitmap] : []);
    } catch (error) {
      bitmap?.close();
      waiting.get(id)?.reject(error);
      waiting.delete(id);
    }
  });
}
