import { countVisit as countVisitTo, visitsCounted } from "../../ui/deviceStorage";

/** What the sticker tray remembers on this device: visits to it. */
const VISITS_KEY = "draw.tray.visits";

/** How many times the tray has been opened on this device. */
export const visitsSoFar = () => visitsCounted(VISITS_KEY);

/** Counts a visit to the tray, and returns how many there have been, this one included. */
export const countVisit = () => countVisitTo(VISITS_KEY);
