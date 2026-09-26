/** Visits to Draw, counted on this device, so the first few can explain the timer. */

const VISITS_KEY = "draw.visits";
/** Visits up to this one get "Starts when you draw" under the timer. */
const FIRST_VISITS = 3;

/** This page's visit, counted the first time Draw opens on a fresh sheet. */
let thisVisit: number | undefined;

/** Whether this is one of the first few visits. Counts the visit on the first call only. */
export function isFirstVisit(): boolean {
  thisVisit ??= countVisit();
  return thisVisit <= FIRST_VISITS;
}

function countVisit(): number {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(VISITS_KEY);
  } catch (error) {
    console.error("Draw visits can't be read on this device", error);
  }
  let visits = Number(raw ?? 0);
  if (!Number.isInteger(visits) || visits < 0) {
    console.error("Draw visits are unreadable, so they're counted afresh:", raw);
    visits = 0;
  }
  try {
    localStorage.setItem(VISITS_KEY, String(visits + 1));
  } catch (error) {
    console.error("Draw visits can't be saved on this device", error);
  }
  return visits + 1;
}
