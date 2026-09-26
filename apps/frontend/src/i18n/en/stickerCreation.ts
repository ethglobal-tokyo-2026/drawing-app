export const stickerCreation = {
  /** The white sheet the sticker is drawn on, named for assistive tech. */
  canvas: "Canvas",
  /** The timer dot, and the white label under it. */
  timer: {
    /** The dot's name while the clock waits for the first stroke. */
    label: "Timer",
    pause: "Pause timer",
    resume: "Resume timer",
    /** The tag every hold wears. */
    paused: "Paused",
    /** Read out with the dot: the time left on its face, and why the clock is stopped. */
    status: {
      running: "{{time}} left",
      waiting: "{{time}} left, starts when you draw",
      paused: "{{time}} left, paused",
      color: "{{time}} left, paused while you choose a color",
      smoothing: "{{time}} left, paused while you set smoothing",
      size: "{{time}} left, paused while you set the brush size",
    },
    /** The label under the dot. */
    note: {
      /** A stroke met the paused sheet. The line break is where the label wraps. */
      tapToKeepDrawing: "Tap the timer\nto keep drawing.",
      /** While the clock waits for the first stroke. */
      startsWhenYouDraw: "Starts when you draw",
      /** Over a drawing kept across a reload. */
      pickedUp: "Picked up where you left off",
      /** A drawing kept across a reload couldn't be read back, but its ticket carries over to a fresh sheet. */
      ticketCarriesOver: "Couldn’t pick up your drawing, so its ticket carries over",
    },
  },
  /** The start card's notes about this sheet. */
  startNote: {
    /** A drawing kept across a reload couldn't be read back. */
    lost: "Couldn’t pick up where you left off.",
    /** Spending the ticket failed; the reason is the API's error. */
    ticketFailed: "Couldn’t use a ticket. {{reason}}",
  },
  /** The seal key, and the chip over it. */
  seal: {
    /** The key's name until the first tap arms it. */
    label: "Seal: tap twice",
    /** The chip, and the key's name, once the first tap has armed it. */
    tapAgain: "Tap again to seal",
    /** The chip when everything drawn was erased or undone. */
    empty: "The sheet is empty, so there’s nothing to seal.",
    /** A toast when time ran out on an empty sheet. */
    emptyAtTimeUp: "Time’s up. The sheet was empty, so nothing was sealed.",
    /** The chip when the server refused or didn't answer the seal; the reason is the API's error. */
    failed: "Couldn’t seal. {{reason}} Tap the check to try again.",
    /** The chip when sealing failed on this device, before the server was asked; the reason stays English. */
    failedHere: "Couldn’t seal ({{reason}}). Tap the check to try again.",
  },
  /** The tool strip's tiles, named for assistive tech. */
  tools: {
    /** Names the strip. */
    label: "Tools",
    brush: "Brush",
    eraser: "Eraser",
    fill: "Fill",
    color: "Color",
    smoothing: "Smoothing",
  },
  colorSheet: {
    title: "Color",
    recent: "Recent",
    recentColors: "Recent colors",
    swatches: "Swatches",
    huePad: "Hue and saturation",
    huePadValue: "Hue {{hue}} degrees, saturation {{saturation}}%",
    brightness: "Brightness",
    /** Each swatch's name, for assistive tech. A color mixed on the pad goes by its hex. */
    swatchNames: {
      ink: "Ink",
      charcoal: "Charcoal",
      graphite: "Graphite",
      stone: "Stone",
      sand: "Sand",
      white: "White",
      cream: "Cream",
      peach: "Peach",
      tan: "Tan",
      brown: "Brown",
      yellow: "Yellow",
      amber: "Amber",
      apricot: "Apricot",
      orange: "Orange",
      tomato: "Tomato",
      red: "Red",
      brick: "Brick",
      chestnut: "Chestnut",
      caramel: "Caramel",
      cocoa: "Cocoa",
      blush: "Blush",
      salmon: "Salmon",
      pink: "Pink",
      lilac: "Lilac",
      grape: "Grape",
      navy: "Navy",
      blue: "Blue",
      sky: "Sky",
      aqua: "Aqua",
      ice: "Ice",
    },
  },
  sizeRail: {
    brush: "Brush size",
    eraser: "Eraser size",
    /** The size as it's read out. */
    value: "{{size}} px",
  },
  /** The bar under the tools, named like its tile. */
  smoothingBar: {
    raw: "Raw",
    smooth: "Smooth",
  },
  history: {
    undo: "Undo",
    redo: "Redo",
  },
  sealCeremony: {
    /** Said to screen readers as the ceremony starts. */
    sealing: "Sealing your sticker",
  },
  /** The backing card the sticker lands on. */
  sealedCard: {
    title: "Sealed",
    /** The sticker's number, its drawing time, the day it was sealed and its artist's handle. */
    finePrint: "{{no}} · <duration/> · {{day}} · {{handle}}",
    keepDrawing: "Keep drawing",
    goToStickerBoard: "Go to sticker board",
    shopForTickets: "Shop for tickets",
    dailyTicketsLeft_one: "{{count}} daily ticket left today",
    dailyTicketsLeft_other: "{{count}} daily tickets left today",
    reserveTickets_one: "{{count}} reserve ticket",
    reserveTickets_other: "{{count}} reserve tickets",
    lastTicket: "That was today’s last ticket · new ones at {{time}}",
    lastDailyTicket: "That was today’s last daily ticket · new ones at {{time}}",
  },
} as const;
