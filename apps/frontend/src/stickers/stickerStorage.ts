export interface StickerRecord {
  id: string;
  /** Running number shown as No.0001. */
  no: number;
  createdAt: number;
  /** Seconds spent drawing. */
  timeUsed: number;
  blob: Blob;
  width: number;
  height: number;
  /** SVG path of the cut line, in image pixels. Older stickers don't have one. */
  outline?: string;
  /**
   * The cut's shape (white, with the cut as alpha), the same size and place as `blob`, whose baked
   * shadow keeps it from acting as a mask. Older stickers don't have one.
   */
  mask?: Blob;
  /**
   * The resin's highlight masks: along the top edge and inside the lower edge. Older stickers don't
   * have them.
   */
  resin?: { spec: Blob; rim: Blob };
  /** The sheet as it was drawn, on white. Older stickers don't have one. */
  flat?: Blob;
  /** Where it sits on the board, once placed. */
  placement?: Placement;
}

export interface Placement {
  /** False while the sticker waits in the sticker tray; its last spot is kept. */
  on: boolean;
  /** Center, as fractions of the board's field. */
  x: number;
  y: number;
  /** Long side, as a fraction of the board's width. */
  s: number;
  /** Clockwise, in degrees. */
  r: number;
  /** Stacking order; higher is on top. */
  z: number;
}

const DB_NAME = "sticker-board";
const STORE = "stickers";
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((error: unknown) => {
    // Whether the open threw or failed, the next call tries again.
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Newest first. */
export async function listStickers(): Promise<StickerRecord[]> {
  const all: unknown[] = await run("readonly", (s) => s.getAll());
  const records = all.map(readSticker).filter((r) => r !== undefined);
  if (records.length < all.length)
    console.error(`Skipped ${all.length - records.length} unreadable stored sticker(s)`);
  return records.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addSticker(data: Omit<StickerRecord, "id" | "no">): Promise<StickerRecord> {
  const existing = await listStickers().catch(() => []);
  const record: StickerRecord = {
    ...data,
    // crypto.randomUUID is missing on plain-http LAN origins (phone testing).
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    no: existing.reduce((m, s) => Math.max(m, s.no), 0) + 1,
  };
  await run("readwrite", (s) => s.put(record));
  return record;
}

/** Undefined when there's no such sticker on this device. */
export async function getSticker(id: string): Promise<StickerRecord | undefined> {
  const stored: unknown = await run("readonly", (s) => s.get(id));
  if (stored === undefined) return undefined;
  const record = readSticker(stored);
  if (!record) console.error(`Stored sticker ${id} is unreadable`);
  return record;
}

export async function updatePlacement(id: string, placement: Placement): Promise<void> {
  const stored: unknown = await run("readonly", (s) => s.get(id));
  const record = readSticker(stored);
  if (!record)
    throw new Error(`Sticker ${id} is ${stored === undefined ? "missing" : "unreadable"}`);
  await run("readwrite", (s) => s.put({ ...record, placement }));
}

/** The fields every stored sticker has; the optional ones are checked as they're read. */
type Stored = Pick<
  StickerRecord,
  "id" | "no" | "createdAt" | "timeUsed" | "blob" | "width" | "height"
> &
  Partial<Record<"outline" | "mask" | "resin" | "flat" | "placement", unknown>>;

const isStored = (v: unknown): v is Stored =>
  typeof v === "object" &&
  v !== null &&
  "id" in v &&
  typeof v.id === "string" &&
  "no" in v &&
  typeof v.no === "number" &&
  "createdAt" in v &&
  typeof v.createdAt === "number" &&
  "timeUsed" in v &&
  typeof v.timeUsed === "number" &&
  "blob" in v &&
  v.blob instanceof Blob &&
  "width" in v &&
  typeof v.width === "number" &&
  "height" in v &&
  typeof v.height === "number";

const isResin = (v: unknown): v is { spec: Blob; rim: Blob } =>
  typeof v === "object" &&
  v !== null &&
  "spec" in v &&
  v.spec instanceof Blob &&
  "rim" in v &&
  v.rim instanceof Blob;

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const isPlacement = (v: unknown): v is Placement =>
  typeof v === "object" &&
  v !== null &&
  "on" in v &&
  typeof v.on === "boolean" &&
  "x" in v &&
  isFiniteNumber(v.x) &&
  "y" in v &&
  isFiniteNumber(v.y) &&
  "s" in v &&
  isFiniteNumber(v.s) &&
  "r" in v &&
  isFiniteNumber(v.r) &&
  "z" in v &&
  isFiniteNumber(v.z);

/**
 * A stored sticker, or undefined when it can't be read: IndexedDB hands back untyped values. A
 * placement from before the board's current model reads as none, so the sticker gets a fresh spot.
 */
export function readSticker(v: unknown): StickerRecord | undefined {
  if (!isStored(v)) return undefined;
  const { outline, mask, resin, flat, placement } = v;
  if (outline !== undefined && typeof outline !== "string") return undefined;
  if (mask !== undefined && !(mask instanceof Blob)) return undefined;
  if (resin !== undefined && !isResin(resin)) return undefined;
  if (flat !== undefined && !(flat instanceof Blob)) return undefined;
  return {
    id: v.id,
    no: v.no,
    createdAt: v.createdAt,
    timeUsed: v.timeUsed,
    blob: v.blob,
    width: v.width,
    height: v.height,
    ...(outline !== undefined && { outline }),
    ...(mask && { mask }),
    ...(resin && { resin }),
    ...(flat && { flat }),
    ...(isPlacement(placement) && { placement }),
  };
}
