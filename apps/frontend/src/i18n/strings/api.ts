import type { Section } from "../catalog";

export const api = {
  /** The screen that holds the app while it signs in to the app's server, and says why it couldn't. */
  signIn: {
    /** LineGate's words, since it shows just before this screen. */
    opening: { en: "Opening your sticker board…" },
    failed: { en: "Couldn’t sign you in" },
    tryAgain: { en: "Try again" },
  },
  /** Asks for a handle when your LINE name is already someone's, before the app opens. */
  handle: {
    title: { en: "Pick your handle" },
    lead: { en: "It’s how people find you and your stickers." },
    leadNameTaken: {
      en: "Someone already goes by @{{name}}, so choose your own. It’s how people find you and your stickers.",
    },
    field: { en: "Your handle" },
    placeholder: { en: "handle" },
    tooLong: { en: "That’s over {{max}} characters." },
    taken: { en: "@{{handle}} is taken. Try another." },
    invalid: { en: "A handle is 1 to {{max}} characters, without “@”." },
    couldntSave: { en: "Couldn’t save your handle: {{reason}}" },
    use: { en: "Use @{{handle}}" },
    pick: { en: "Pick a handle" },
  },
} as const satisfies Section;
