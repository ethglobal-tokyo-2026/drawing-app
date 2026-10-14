import {
  mountSticker,
  mountStickerCopy,
  refreshSticker,
  stickerFoilCoverage,
  updateSticker,
  whenStickerSettled,
  type StickerSurface,
} from "../src/stickers/stickerRenderer";
import { required } from "./stickerMaterialFixture";

type Material = Parameters<typeof updateSticker>[1];
let state:
  | {
      canvas: HTMLCanvasElement;
      initial: Material;
      target: Material;
      before: string;
      description: ReturnType<typeof stickerFoilCoverage>;
      dispose: () => void;
    }
  | undefined;
const current = () => required(state);
const frames = async () => {
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
};
function output(id: string, left: number, width = 80) {
  const host = document.createElement("div");
  host.className = "sticker-material-surface";
  host.style.cssText = `position:fixed;left:${left}px;top:20px;width:${width}px;height:80px`;
  const canvas = document.createElement("canvas");
  canvas.id = id;
  host.append(canvas);
  document.body.append(host);
  return canvas;
}
async function settled(canvas: HTMLCanvasElement) {
  const signal = AbortSignal.timeout(5000);
  await whenStickerSettled(canvas, undefined, signal);
  signal.throwIfAborted();
  await frames();
}

/** Real registered material and normal resources in a fixed source frame. */
export async function setup(kind: "foil" | "paper", registered = true) {
  const image = document.createElement("canvas");
  image.width = image.height = 80;
  const context = required(image.getContext("2d"));
  context.fillStyle = "white";
  context.fillRect(12, 12, 56, 56);
  const cut = image.toDataURL();
  context.fillStyle = "#a95276";
  context.fillRect(12, 12, 56, 56);
  const print = image.toDataURL();
  image.width = image.height = 0;
  const canvas = output("normal-removal", 15);
  const initial: Material = {
    print,
    cut,
    finish: "gloss",
    normal: "/normal-removal-normal.svg",
    ...(kind === "foil"
      ? {
          foil: { style: "holo", size: "board" },
          ...(registered && {
            normalBounds: { x: -0.125, y: -0.125, width: 1.25, height: 1.25 },
          }),
        }
      : {}),
  };
  const dispose = mountSticker(canvas, { ...initial, turn: 0 } satisfies StickerSurface);
  await settled(canvas);
  if (canvas.dataset.state !== "ready" || canvas.dataset.error)
    throw new Error(`Initial creased material failed: ${canvas.dataset.error}`);
  const target: Material = {
    ...initial,
    normal: undefined,
    normalBounds: undefined,
    ...(kind === "foil"
      ? { foil: { style: "pink", size: "board", mask: "/normal-removal-target-mask.svg" } }
      : { print: "/normal-removal-target-print.svg", cut: "/normal-removal-target-cut.svg" }),
  };
  state = {
    canvas,
    initial,
    target,
    before: canvas.toDataURL(),
    description: stickerFoilCoverage(canvas),
    dispose,
  };
}
export function begin(late: boolean) {
  const { canvas, initial, target } = current();
  updateSticker(
    canvas,
    late ? { ...target, normal: initial.normal, normalBounds: initial.normalBounds } : target,
  );
}
export function remove() {
  const { canvas, target } = current();
  updateSticker(canvas, target);
}
export async function inspect() {
  const { canvas, before, description } = current();
  refreshSticker(canvas);
  await frames();
  return {
    retainedPixels: canvas.toDataURL() === before,
    retainedDescription: stickerFoilCoverage(canvas) === description,
    style: stickerFoilCoverage(canvas)?.material.style,
    error: canvas.dataset.error ?? null,
    pixels: canvas.width * canvas.height,
  };
}
export async function restore() {
  const { canvas, initial } = current();
  updateSticker(canvas, initial);
  await settled(canvas);
}
export function cancel() {
  current().dispose();
}
export async function finish() {
  await settled(current().canvas);
}
export async function unchangedRemoval() {
  const { canvas, initial } = current();
  updateSticker(canvas, { ...initial, normal: undefined });
  await settled(canvas);
}

/** A live independent copy must inherit the accepted normal and registration, not the request. */
export async function compareCopy() {
  const { canvas, before, description } = current();
  const restore = matchResizeAtlasSlot(canvas);
  const copy = output("normal-removal-copy", 110, required(canvas.parentElement).clientWidth);
  const dispose = mountStickerCopy(copy, canvas, () => true);
  try {
    await settled(copy);
    refreshSticker(copy);
    await frames();
    return {
      samePixels: copy.toDataURL() === canvas.toDataURL(),
      retainedPixels: copy.toDataURL() === before,
      retainedDescription: stickerFoilCoverage(copy) === description,
    };
  } finally {
    dispose();
    copy.parentElement?.remove();
    restore();
  }
}

/** Compare actual replacement pixels with an independently mounted flat target. */
export async function compareFlat(unchanged = false) {
  const { canvas, initial, target } = current();
  const restore = matchResizeAtlasSlot(canvas);
  const reference = output(
    "normal-removal-reference",
    205,
    required(canvas.parentElement).clientWidth,
  );
  const material = unchanged ? { ...initial, normal: undefined } : target;
  const dispose = mountSticker(reference, { ...material, turn: 0 });
  try {
    await settled(reference);
    return {
      samePixels: canvas.toDataURL() === reference.toDataURL(),
      style: stickerFoilCoverage(canvas)?.material.style,
      mask: stickerFoilCoverage(canvas)?.material.mask,
      frame: stickerFoilCoverage(canvas)?.frame,
    };
  } finally {
    dispose();
    reference.parentElement?.remove();
    restore();
  }
}

/** WebKit may round a channel differently in adjacent fractional-density atlas tiles. Render
 * resized comparisons in the source's slot, retaining the source bitmap and all its resources. */
function matchResizeAtlasSlot(canvas: HTMLCanvasElement) {
  const host = required(canvas.parentElement);
  const left = host.style.left;
  if (host.clientWidth !== 80) host.style.left = "-2000px";
  return () => {
    host.style.left = left;
  };
}

/** Resize only the source box while required coverage is held. The independent copy keeps A's
 * accepted source frame and normal, providing exact A pixels at the new displayed dimensions. */
export async function resizePending() {
  const owner = current();
  const copy = output("normal-removal-resize-copy", 110);
  const dispose = mountStickerCopy(copy, owner.canvas, () => true);
  try {
    await settled(copy);
    required(owner.canvas.parentElement).style.width = "96px";
    required(copy.parentElement).style.width = "96px";
    await frames();
    required(owner.canvas.parentElement).style.left = "-2000px";
    refreshSticker(copy);
    await settled(copy);
    owner.before = copy.toDataURL();
  } finally {
    dispose();
    copy.parentElement?.remove();
    required(owner.canvas.parentElement).style.left = "15px";
    refreshSticker(owner.canvas);
    await frames();
  }
}

/** After a successful removal, requesting the retired URL must acquire a new normal resource. */
export async function reacquireNormal() {
  const { canvas, initial, target } = current();
  updateSticker(canvas, { ...target, normal: initial.normal });
  await settled(canvas);
}
