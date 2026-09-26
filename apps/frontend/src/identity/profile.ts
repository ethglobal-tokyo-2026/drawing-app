/** Link shared for the board (placeholder until boards are public). */
export const boardUrl = (handle: string) =>
  `${location.origin}${location.pathname}?board=${encodeURIComponent(handle)}`;

const FIRST_SEEN_KEY = "draw.firstSeen";

/** When this browser first opened the app ("On the app since"). */
export function firstSeen(): number {
  try {
    const saved = Number(localStorage.getItem(FIRST_SEEN_KEY));
    if (saved) return saved;
    const now = Date.now();
    localStorage.setItem(FIRST_SEEN_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}
