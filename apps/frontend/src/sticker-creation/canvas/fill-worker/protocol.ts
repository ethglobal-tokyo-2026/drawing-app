import type { Rect } from "../../sealing/stickerPasses";
import type { Cut, FoundFill, Pixels, Rgb, WrittenFill } from "../fill";
import { FillError } from "./errors";

export interface FillPatchInput {
  at: Rect;
  shown: Pixels;
  target: Pixels;
  sx: number;
  sy: number;
  color: Rgb;
  gap: number;
  locked: boolean;
  cut?: Cut;
}

export type FillPatchResult =
  | { kind: "past" }
  | { kind: "empty" }
  | {
      kind: "found";
      pixels: Pixels;
      found: FoundFill;
      interiorSpans: Uint32Array;
      written: WrittenFill | null;
    };

export interface FillWorkerRequest {
  id: number;
  input: FillPatchInput;
}
export type FillWorkerResponse =
  | { id: number; type: "complete"; result: FillPatchResult }
  | { id: number; type: "failure"; message: string };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const integer = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value);
const rectangle = (value: unknown): value is Rect =>
  record(value) &&
  integer(value.x) &&
  value.x >= 0 &&
  integer(value.y) &&
  value.y >= 0 &&
  integer(value.w) &&
  value.w > 0 &&
  integer(value.h) &&
  value.h > 0 &&
  Number.isSafeInteger(value.x + value.w) &&
  Number.isSafeInteger(value.y + value.h);
const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;
const pixels = (value: unknown, at: Rect): value is Pixels =>
  record(value) &&
  value.width === at.w &&
  value.height === at.h &&
  value.data instanceof Uint8ClampedArray &&
  value.data.buffer instanceof ArrayBuffer &&
  value.data.length === at.w * at.h * 4;

/** Rejects invalid dimensions before a transfer can detach the caller's pixel arrays. */
export function validateFillPatch(input: FillPatchInput): void {
  const { at, shown, target, sx, sy, color, gap, locked, cut } = input;
  if (
    !rectangle(at) ||
    !pixels(shown, at) ||
    !pixels(target, at) ||
    !integer(sx) ||
    !integer(sy) ||
    sx < 0 ||
    sy < 0 ||
    sx >= at.w ||
    sy >= at.h ||
    color.length !== 3 ||
    !color.every((channel) => integer(channel) && channel >= 0 && channel <= 255) ||
    !Number.isFinite(gap) ||
    gap < 0 ||
    typeof locked !== "boolean" ||
    (cut !== undefined &&
      ![cut.left, cut.top, cut.right, cut.bottom].every((side) => typeof side === "boolean"))
  ) {
    throw new FillError(
      "Fill patch has invalid dimensions, pixels, seed, color, gap, or cut sides",
    );
  }
}

/** Spans stay ordered, disjoint, and within their recorded rectangle. */
function spanLength(value: unknown, at: Rect): number | null {
  if (!(value instanceof Uint32Array) || value.length % 3 !== 0) return null;
  let count = 0;
  let previousY = -1;
  let previousEnd = -1;
  for (let i = 0; i < value.length; i += 3) {
    const [y, start, end] = [value[i], value[i + 1], value[i + 2]];
    if (
      y < at.y ||
      y >= at.y + at.h ||
      start < at.x ||
      end > at.x + at.w ||
      end <= start ||
      y < previousY ||
      (y === previousY && start < previousEnd)
    )
      return null;
    count += end - start;
    previousY = y;
    previousEnd = end;
  }
  return count;
}

function writtenFill(value: unknown, box: Rect): value is WrittenFill {
  if (
    !record(value) ||
    !rectangle(value.box) ||
    value.box.x !== box.x ||
    value.box.y !== box.y ||
    value.box.w !== box.w ||
    value.box.h !== box.h ||
    !(value.spans instanceof Uint32Array) ||
    !(value.colors instanceof Uint32Array) ||
    value.colors.length % 2 !== 0
  )
    return false;
  const count = spanLength(value.spans, box);
  if (count === null || count === 0) return false;
  let recorded = 0;
  for (let i = 0; i < value.colors.length; i += 2) {
    if (value.colors[i] === 0) return false;
    recorded += value.colors[i];
  }
  return count === recorded;
}

/** Checks transport output before pixels can reach a layer canvas or cached replay. */
export function isFillPatchResult(value: unknown, at: Rect): value is FillPatchResult {
  if (!record(value)) return false;
  if (value.kind === "empty" || value.kind === "past") return true;
  if (
    value.kind !== "found" ||
    !pixels(value.pixels, at) ||
    !record(value.found) ||
    !rectangle(value.found.box) ||
    !contains({ x: 0, y: 0, w: at.w, h: at.h }, value.found.box) ||
    typeof value.found.paper !== "boolean" ||
    !(value.found.marks instanceof Uint8Array) ||
    value.found.marks.length !== value.found.box.w * value.found.box.h ||
    !(value.interiorSpans instanceof Uint32Array)
  )
    return false;
  const box = { ...value.found.box, x: at.x + value.found.box.x, y: at.y + value.found.box.y };
  const count = spanLength(value.interiorSpans, box);
  return count !== null && count > 0 && (value.written === null || writtenFill(value.written, box));
}

export function readFillWorkerResponse(value: unknown, id: number, at: Rect): FillWorkerResponse {
  if (record(value) && value.id === id) {
    if (value.type === "failure" && typeof value.message === "string")
      return { id, type: "failure", message: value.message };
    if (value.type === "complete" && isFillPatchResult(value.result, at))
      return { id, type: "complete", result: value.result };
  }
  throw new FillError("Fill worker returned a malformed response or an unexpected request ID");
}

/** An aliased shown/target buffer must be handed over only once. */
export function fillTransferBuffers(arrays: readonly ArrayBufferView[]): ArrayBuffer[] {
  const buffers = new Set<ArrayBuffer>();
  for (const array of arrays) {
    if (!(array.buffer instanceof ArrayBuffer))
      throw new FillError("Fill arrays must have transferable buffers");
    buffers.add(array.buffer);
  }
  return [...buffers];
}
