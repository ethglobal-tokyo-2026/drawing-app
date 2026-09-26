import type { Section } from "../catalog";

export const gratitude = {
  /** The Mini-game's name: LINE's header shows it, and it names the dialog. */
  title: { en: "Send gratitude" },
  /** Names the sticker the gratitude is for, for assistive tech. */
  sticker: { en: "Sticker {{no}}" },
  /** Over the giver's handle. */
  from: { en: "From" },
  close: { en: "Close" },
  /** The heart's button, for assistive tech. */
  heart: { en: "Send gratitude to {{handle}}" },
  /** Under the heart until the first tap. */
  hint: { en: "Tap the heart as fast as you can!" },
  /** What to do, shown and said once the person is trying. */
  tips: {
    stroke: { en: "Stroke it back and forth, fast" },
    shake: { en: "Keep shaking!" },
  },
  /** The sigh that drifts up as the combo ends. */
  sigh: { en: "fuu…" },
  hud: {
    /** After the seconds left on the bar. */
    secondsUnit: { en: "s" },
    /** Over the bar's end as a hit lands: the time it added. */
    secondsAdded: { en: "+{{seconds}}s" },
  },
  /** Said through the screen's polite live region, for assistive tech. */
  announcements: {
    /** As the first tap starts the bar. */
    keepTapping: { en: "Keep tapping before the bar runs out." },
    /** The combo so far. `total` is formatted. */
    total: { en: "{{total}} gratitude, times {{multiplier}}" },
    strokeUnlocked: { en: "Stroke unlocked." },
    shakeUnlocked: { en: "Shake unlocked." },
    /** A shake's unlock, where motion isn't reduced: the heart comes loose. */
    heartLoose: { en: "The heart is loose." },
    /** As the heart reaches the giver. `total` is formatted; `handle` is as printed: "@alice". */
    sent: { en: "Sent {{total}} gratitude to {{handle}}." },
  },
  receipt: {
    /** Names the receipt for assistive tech. */
    label: { en: "Gratitude sent" },
    /** Under the combo's total. */
    gratitudeTo: { en: "gratitude to {{handle}}" },
    /** The combo's best multiplier and its length. `hits` is formatted; `count` picks the form. */
    best_one: { en: "best ×{{multiplier}} · {{hits}} hit" },
    best_other: { en: "best ×{{multiplier}} · {{hits}} hits" },
    backToBoard: { en: "Back to your board" },
  },
  failures: {
    stopped: { en: "The game stopped. Close it and send your gratitude again." },
    /** The server refused the combo for good. */
    refused: { en: "Your gratitude didn't reach {{handle}}. Close this and send it again." },
  },
} as const satisfies Section;
