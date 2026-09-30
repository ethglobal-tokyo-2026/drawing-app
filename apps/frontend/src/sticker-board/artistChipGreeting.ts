/**
 * Whose boards have greeted their foil stickers with the artists' chips. A board does it once per app
 * open, its owner's own included: the chips are the one place that says what foil means, but played
 * over the art on every visit they only cover it.
 */
const greeted = new Set<string>();

/** Whether the board of `ownerId` still owes its greeting. */
export const owesGreeting = (ownerId: string) => !greeted.has(ownerId);

/** The board of `ownerId` has greeted, or been interacted with before it could. */
export const markGreeted = (ownerId: string) => void greeted.add(ownerId);

/** A fresh app open, for tests. */
export const forgetGreetings = () => greeted.clear();
