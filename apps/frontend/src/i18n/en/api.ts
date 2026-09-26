export const api = {
  /** The screen that holds the app while it signs in to the app's server, and says why it couldn't. */
  signIn: {
    /** LineGate's words, since it shows just before this screen. */
    opening: "Opening your sticker board…",
    failed: "Couldn’t sign you in",
    tryAgain: "Try again",
  },
} as const;
