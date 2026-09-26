export const gratitude = {
  /** The Mini-game's name: LINE's header shows it, and it names the dialog. */
  title: "Send gratitude",
  /** Names the sticker the gratitude is for, for assistive tech. */
  sticker: "Sticker {{no}}",
  /** Over the giver's handle. */
  from: "From",
  close: "Close",
  /** The heart's button, for assistive tech. */
  heart: "Send gratitude to {{handle}}",
  /** Under the heart until the first tap. */
  hint: "Tap the heart as fast as you can!",
  /** What to do, shown and said once the person is trying. */
  tips: {
    stroke: "Stroke it back and forth, fast",
    shake: "Keep shaking!",
  },
  /** The sigh that drifts up as the combo ends. */
  sigh: "fuu…",
  hud: {
    /** After the seconds left on the bar. */
    secondsUnit: "s",
    /** Over the bar's end as a hit lands: the time it added. */
    secondsAdded: "+{{seconds}}s",
  },
  /** Said through the screen's polite live region, for assistive tech. */
  announcements: {
    /** As the first tap starts the bar. */
    keepTapping: "Keep tapping before the bar runs out.",
    /** The combo so far. `total` is formatted. */
    total: "{{total}} gratitude, times {{multiplier}}",
    strokeUnlocked: "Stroke unlocked.",
    shakeUnlocked: "Shake unlocked.",
    /** A shake's unlock, where motion isn't reduced: the heart comes loose. */
    heartLoose: "The heart is loose.",
    /** As the heart reaches the giver. `total` is formatted; `handle` is as printed: "@alice". */
    sent: "Sent {{total}} gratitude to {{handle}}.",
  },
  receipt: {
    /** Names the receipt for assistive tech. */
    label: "Gratitude sent",
    /** Under the combo's total. */
    gratitudeTo: "gratitude to {{handle}}",
    /** The combo's best multiplier and its length. `hits` is formatted; `count` picks the form. */
    best_one: "best ×{{multiplier}} · {{hits}} hit",
    best_other: "best ×{{multiplier}} · {{hits}} hits",
    backToBoard: "Back to your board",
  },
  failures: {
    stopped: "The game stopped. Close it and send your gratitude again.",
    /** The server refused the combo for good. */
    refused: "Your gratitude didn't reach {{handle}}. Close this and send it again.",
  },
} as const;
