import { countVisit, personKey, visitsCounted } from "../ui/deviceStorage";

/** Times the selection hint has been shown to a person on this device: once, ever, is all it takes. */
const shownKey = (userId: string) => personKey("draw.board.selectionHint", userId);

/**
 * People the hint has been shown to on this page. A phone that can't keep the count then says it
 * once per page rather than on every selection.
 */
const shownHere = new Set<string>();

/** Whether `userId` hasn't yet been shown how to go on from a selected sticker, on this device. */
export const owesSelectionHint = (userId: string) =>
  !shownHere.has(userId) && visitsCounted(shownKey(userId)) === 0;

/** Remembers that the hint has been shown to `userId`. Only the first call counts. */
export function markSelectionHintShown(userId: string) {
  if (shownHere.has(userId)) return;
  shownHere.add(userId);
  countVisit(shownKey(userId));
}

/** A fresh page open, for tests. */
export const forgetSelectionHints = () => shownHere.clear();
