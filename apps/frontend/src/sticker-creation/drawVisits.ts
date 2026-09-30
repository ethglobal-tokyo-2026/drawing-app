import { countVisit } from "../ui/deviceStorage";

/** Visits to Draw, counted on this device, so the first few can explain the timer. */
const VISITS_KEY = "draw.visits";
/** Visits up to this one get "Starts when you draw" under the timer. */
const FIRST_VISITS = 3;

/** This page's visit, counted the first time Draw opens on a fresh sheet. */
let thisVisit: number | undefined;

/** Whether this is one of the first few visits. Counts the visit on the first call only. */
export function isFirstVisit(): boolean {
  thisVisit ??= countVisit(VISITS_KEY);
  return thisVisit <= FIRST_VISITS;
}
