/** What the sticker tray remembers on this device: visits to it. */

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

/** How many times the tray has been opened on this device: 0 when there's no record or it's unreadable. */
export function visitsSoFar(): number {
  const raw = read(VISITS_KEY);
  const visits = Number(raw ?? 0);
  if (!Number.isInteger(visits) || visits < 0) {
    console.error("Tray visits are unreadable, so they're counted afresh:", raw);
    return 0;
  }
  return visits;
}

/** Counts a visit to the tray, and returns how many there have been, this one included. */
export function countVisit(): number {
  const visits = visitsSoFar() + 1;
  write(VISITS_KEY, String(visits));
  return visits;
}
