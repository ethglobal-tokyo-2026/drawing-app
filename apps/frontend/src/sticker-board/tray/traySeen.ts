/** What the sticker tray remembers on this device: the stickers seen in it, and visits to it. */

const SEEN_KEY = "draw.tray.seen";
const VISITS_KEY = "draw.tray.visits";

/** A stored value, or null when there's none or storage is blocked. */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`The sticker tray can't read ${key} on this device`, error);
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`The sticker tray can't save ${key} on this device`, error);
  }
}

const isIdList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((id) => typeof id === "string");

/** The stickers seen in the open tray, so NEW doesn't come back after a reload. */
export function readSeen(): Set<string> {
  const raw = read(SEEN_KEY);
  if (raw === null) return new Set();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = undefined;
  }
  if (isIdList(value)) return new Set(value);
  console.error("Seen stickers are unreadable, so today's show as NEW again:", raw);
  return new Set();
}

export function saveSeen(seen: ReadonlySet<string>) {
  write(SEEN_KEY, JSON.stringify([...seen]));
}

/** Counts a visit to the tray, and returns how many there have been, this one included. */
export function countVisit(): number {
  const raw = read(VISITS_KEY);
  let visits = Number(raw ?? 0);
  if (!Number.isInteger(visits) || visits < 0) {
    console.error("Tray visits are unreadable, so they're counted afresh:", raw);
    visits = 0;
  }
  write(VISITS_KEY, String(visits + 1));
  return visits + 1;
}
