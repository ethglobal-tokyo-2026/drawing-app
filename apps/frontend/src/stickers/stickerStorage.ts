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
  /** Degrees, so each sticker sits on the board a little crooked. */
  rotation: number;
  /** Where it sits on the board, once placed or moved. */
  placement?: Placement;
  /** SVG path of the cut line, in image pixels. Missing on stickers sealed before it was kept. */
  outline?: string;
  /** Set once it's given: it leaves your board and waits in a gift bag for the recipient. */
  gift?: Gift;
}

export interface Gift {
  /** The recipient's handle. */
  to: string;
  givenAt: number;
}

export interface Placement {
  /** Center, as fractions of board width and height. */
  x: number;
  y: number;
  /** Width as a fraction of board width. */
  scale: number;
  /** Stacking order; higher is on top. */
  z: number;
}

const DB_NAME = "sticker-board";
const STORE = "stickers";
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
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
  const records = all.filter(isStickerRecord);
  if (records.length < all.length)
    console.error(`Skipped ${all.length - records.length} unreadable stored sticker(s)`);
  return records.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addSticker(
  data: Omit<StickerRecord, "id" | "no" | "rotation">,
): Promise<StickerRecord> {
  const existing = await listStickers().catch(() => []);
  const record: StickerRecord = {
    ...data,
    // crypto.randomUUID is missing on plain-http LAN origins (phone testing).
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    no: existing.reduce((m, s) => Math.max(m, s.no), 0) + 1,
    rotation: Math.round((Math.random() * 2 - 1) * 9),
  };
  await run("readwrite", (s) => s.put(record));
  return record;
}

export const deleteSticker = (id: string) => run("readwrite", (s) => s.delete(id));

/** Stickers still yours to show or give: newest first, without the ones given away. */
export const listKeptStickers = async () => (await listStickers()).filter((s) => !s.gift);

export async function giveSticker(id: string, to: string): Promise<Gift> {
  const record: unknown = await run("readonly", (s) => s.get(id));
  if (!isStickerRecord(record)) throw new Error(`No stored sticker with id ${id}`);
  if (record.gift) throw new Error(`${id} was already given to @${record.gift.to}`);
  const gift: Gift = { to, givenAt: Date.now() };
  await run("readwrite", (s) => s.put({ ...record, gift }));
  return gift;
}

export async function updatePlacement(id: string, placement: Placement): Promise<void> {
  const record: unknown = await run("readonly", (s) => s.get(id));
  if (isStickerRecord(record)) await run("readwrite", (s) => s.put({ ...record, placement }));
}

const isGift = (v: unknown): v is Gift =>
  typeof v === "object" &&
  v !== null &&
  "to" in v &&
  typeof v.to === "string" &&
  "givenAt" in v &&
  typeof v.givenAt === "number";

const isPlacement = (v: unknown): v is Placement =>
  typeof v === "object" &&
  v !== null &&
  "x" in v &&
  typeof v.x === "number" &&
  "y" in v &&
  typeof v.y === "number" &&
  "scale" in v &&
  typeof v.scale === "number" &&
  "z" in v &&
  typeof v.z === "number";

// IndexedDB hands back untyped values, so records are checked on the way out.
const isStickerRecord = (v: unknown): v is StickerRecord =>
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
  typeof v.height === "number" &&
  "rotation" in v &&
  typeof v.rotation === "number" &&
  (!("placement" in v) || v.placement === undefined || isPlacement(v.placement)) &&
  (!("outline" in v) || v.outline === undefined || typeof v.outline === "string") &&
  (!("gift" in v) || v.gift === undefined || isGift(v.gift));
