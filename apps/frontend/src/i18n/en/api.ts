export const api = {
  /** The screen that holds the app while it signs in to the app's server, and says why it couldn't. */
  signIn: {
    /** LineGate's words, since it shows just before this screen. */
    opening: "Opening your sticker board…",
    failed: "Couldn’t sign you in",
    tryAgain: "Try again",
  },
  /** Asks for a handle when your LINE name is already someone's, before the app opens. */
  handle: {
    title: "Pick your handle",
    lead: "It’s how people find you and your stickers.",
    leadNameTaken:
      "Someone already goes by @{{name}}, so choose your own. It’s how people find you and your stickers.",
    field: "Your handle",
    placeholder: "handle",
    tooLong: "That’s over {{max}} characters.",
    taken: "@{{handle}} is taken. Try another.",
    invalid: "A handle is 1 to {{max}} characters, without “@”.",
    couldntSave: "Couldn’t save your handle: {{reason}}",
    use: "Use @{{handle}}",
    pick: "Pick a handle",
  },
} as const;
