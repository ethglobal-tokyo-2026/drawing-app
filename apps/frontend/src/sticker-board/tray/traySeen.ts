import { countVisit as countVisitTo } from "../../ui/deviceStorage";

/** What the sticker tray remembers on this device: visits to it. */
const VISITS_KEY = "draw.tray.visits";

/** Counts a visit to the tray, and returns how many there have been, this one included. */
export const countVisit = () => countVisitTo(VISITS_KEY);
