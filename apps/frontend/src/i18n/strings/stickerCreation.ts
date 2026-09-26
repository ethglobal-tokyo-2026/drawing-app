import type { Section } from "../catalog";

export const stickerCreation = {
  /** The white sheet the sticker is drawn on, named for assistive tech. */
  canvas: { en: "Canvas" },
  /** The timer dot, and the white label under it. */
  timer: {
    /** The dot's name while the clock waits for the first stroke. */
    label: { en: "Timer" },
    pause: { en: "Pause timer" },
    resume: { en: "Resume timer" },
    /** The tag every hold wears. */
    paused: { en: "Paused" },
    /** Read out with the dot: the time left on its face, and why the clock is stopped. */
    status: {
      running: { en: "{{time}} left" },
      waiting: { en: "{{time}} left, starts when you draw" },
      paused: { en: "{{time}} left, paused" },
      color: { en: "{{time}} left, paused while you choose a color" },
      smoothing: { en: "{{time}} left, paused while you set smoothing" },
      size: { en: "{{time}} left, paused while you set the brush size" },
    },
    /** The label under the dot. */
    note: {
      /** A stroke met the paused sheet. The line break is where the label wraps. */
      tapToKeepDrawing: { en: "Tap the timer\nto keep drawing." },
      /** While the clock waits for the first stroke. */
      startsWhenYouDraw: { en: "Starts when you draw" },
      /** Over a drawing kept across a reload. */
      pickedUp: { en: "Picked up where you left off" },
      /** A drawing kept across a reload couldn't be read back, but its ticket carries over to a fresh sheet. */
      ticketCarriesOver: { en: "Couldn’t pick up your drawing, so its ticket carries over" },
    },
  },
  /** The start card's notes about this sheet. */
  startNote: {
    /** A drawing kept across a reload couldn't be read back. */
    lost: { en: "Couldn’t pick up where you left off." },
    /** Spending the ticket failed; the reason is the API's error. */
    ticketFailed: { en: "Couldn’t use a ticket. {{reason}}" },
  },
  /** The seal key, and the chip over it. */
  seal: {
    /** The key's name until the first tap arms it. */
    label: { en: "Seal: tap twice" },
    /** The chip, and the key's name, once the first tap has armed it. */
    tapAgain: { en: "Tap again to seal" },
    /** The chip when everything drawn was erased or undone. */
    empty: { en: "The sheet is empty, so there’s nothing to seal." },
    /** A toast when time ran out on an empty sheet. */
    emptyAtTimeUp: { en: "Time’s up. The sheet was empty, so nothing was sealed." },
    /** The chip when the server refused or didn't answer the seal; the reason is the API's error. */
    failed: { en: "Couldn’t seal. {{reason}} Tap the check to try again." },
    /** The chip when sealing failed on this device, before the server was asked; the reason stays English. */
    failedHere: { en: "Couldn’t seal ({{reason}}). Tap the check to try again." },
  },
  /** The tool strip's tiles, named for assistive tech. */
  tools: {
    /** Names the strip. */
    label: { en: "Tools" },
    brush: { en: "Brush" },
    eraser: { en: "Eraser" },
    fill: { en: "Fill" },
    color: { en: "Color" },
    smoothing: { en: "Smoothing" },
  },
  colorSheet: {
    title: { en: "Color" },
    recent: { en: "Recent" },
    recentColors: { en: "Recent colors" },
    swatches: { en: "Swatches" },
    huePad: { en: "Hue and saturation" },
    huePadValue: { en: "Hue {{hue}} degrees, saturation {{saturation}}%" },
    brightness: { en: "Brightness" },
    /** Each swatch's name, for assistive tech. A color mixed on the pad goes by its hex. */
    swatchNames: {
      ink: { en: "Ink" },
      charcoal: { en: "Charcoal" },
      graphite: { en: "Graphite" },
      stone: { en: "Stone" },
      sand: { en: "Sand" },
      white: { en: "White" },
      cream: { en: "Cream" },
      peach: { en: "Peach" },
      tan: { en: "Tan" },
      brown: { en: "Brown" },
      yellow: { en: "Yellow" },
      amber: { en: "Amber" },
      apricot: { en: "Apricot" },
      orange: { en: "Orange" },
      tomato: { en: "Tomato" },
      red: { en: "Red" },
      brick: { en: "Brick" },
      chestnut: { en: "Chestnut" },
      caramel: { en: "Caramel" },
      cocoa: { en: "Cocoa" },
      blush: { en: "Blush" },
      salmon: { en: "Salmon" },
      pink: { en: "Pink" },
      lilac: { en: "Lilac" },
      grape: { en: "Grape" },
      navy: { en: "Navy" },
      blue: { en: "Blue" },
      sky: { en: "Sky" },
      aqua: { en: "Aqua" },
      ice: { en: "Ice" },
    },
  },
  sizeRail: {
    brush: { en: "Brush size" },
    eraser: { en: "Eraser size" },
    /** The size as it's read out. */
    value: { en: "{{size}} px" },
  },
  /** The bar under the tools, named like its tile. */
  smoothingBar: {
    raw: { en: "Raw" },
    smooth: { en: "Smooth" },
  },
  history: {
    undo: { en: "Undo" },
    redo: { en: "Redo" },
  },
  sealCeremony: {
    /** Said to screen readers as the ceremony starts. */
    sealing: { en: "Sealing your sticker" },
  },
  /** The backing card the sticker lands on. */
  sealedCard: {
    title: { en: "Sealed" },
    /** The sticker's number, its drawing time, the day it was sealed and its artist's handle. */
    finePrint: { en: "{{no}} · <duration/> · {{day}} · <handle/>" },
    keepDrawing: { en: "Keep drawing" },
    goToStickerBoard: { en: "Go to sticker board" },
    shopForTickets: { en: "Shop for tickets" },
    dailyTicketsLeft_one: { en: "{{count}} daily ticket left today" },
    dailyTicketsLeft_other: { en: "{{count}} daily tickets left today" },
    reserveTickets_one: { en: "{{count}} reserve ticket" },
    reserveTickets_other: { en: "{{count}} reserve tickets" },
    lastTicket: { en: "That was today’s last ticket · new ones at {{time}}" },
    lastDailyTicket: { en: "That was today’s last daily ticket · new ones at {{time}}" },
  },
} as const satisfies Section;
