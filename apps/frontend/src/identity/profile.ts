/**
 * Placeholder identity until real accounts (ENS) exist. Everything the
 * profile card shows about "who you are" comes from here.
 */
export const PROFILE = {
  username: "alice",
  displayName: "Alice Sato",
  boardAddress: "alice.sketch.eth",
};

/** Link shared for the board (placeholder until boards are public). */
export const boardUrl = () => `${location.origin}${location.pathname}?board=${PROFILE.username}`;

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
