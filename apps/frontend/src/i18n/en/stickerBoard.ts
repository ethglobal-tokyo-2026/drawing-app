export const stickerBoard = {
  /** The Sticker Board's cork back: your own, or someone else's. */
  statBoard: {
    label: "{{name}}’s stats",
    /** A figure whose source didn't load: a dash on screen, words for screen readers. */
    notKnown: { mark: "–", spoken: "not known" },
    gratitude: {
      title: "Gratitude received",
      inspired: { label: "Inspired", reason: "Gratitude for stickers they gave." },
      magic: { label: "Magic", reason: "Gratitude sent a special way." },
      asOriginalArtist: {
        label: "Original Artist",
        reason: "A share of the gratitude when a sticker they drew is given on.",
      },
      didntLoad: "Gratitude didn’t load.",
      noneYetOwn:
        "No gratitude yet. It arrives when someone you give a sticker to sends you some for it.",
      noneYet:
        "No gratitude yet. It arrives when someone sends gratitude for a sticker they gave them.",
      total: "Total",
    },
    bests: {
      title: "Bests",
      longestStreak: "Longest streak",
      /** `days` is the count, grouped. */
      days_one: "{{days}} day",
      days_other: "{{days}} days",
      bestCombo: "Best combo",
      bestComboNote: "Most hits in one gratitude combo",
      /** `hits` is the count, grouped. */
      combo: "×{{hits}}",
      mostGratitudeInADay: "Most gratitude in a day",
      noneYet: "None yet",
    },
    /** The day they joined, on label-maker tape. */
    since: "Since {{day}}",
    sinceSpoken: "On the app since {{day}}",
    streak: {
      title: "Streak",
      /** Under the day count. */
      days_one: "day",
      days_other: "days",
      notStarted: "Not started",
      rule: "Miss a day and it goes back to zero. Days turn over at {{time}}.",
      startOwn: "Draw a sticker today to start one.",
      start: "It starts the first day they draw.",
    },
    didntLoadOwn: "Your stats didn’t load.",
    didntLoad: "Their stats didn’t load.",
    didntLoadOwnBecause: "Your stats didn’t load: {{reason}}",
    stamps: { label: "Stickers", made: "made", received: "received", given: "given" },
    flipBack: "Flip back",
    logOut: "Log out of LINE",
  },
  /** Your addresses as QR codes on the cork, and the dialog that holds one up. */
  addresses: {
    ethereum: {
      caption: "Board address",
      network: "Ethereum Sepolia",
      open: "Show your board address as a QR code",
      loading: "Getting your board address…",
      didntLoad: "Board address didn’t load",
      title: "Your board address",
      qrCode: "QR code of your board address",
      note: "Your stickers are kept at this address on Ethereum Sepolia.",
      copied: "Board address copied",
      notCopied: "Couldn’t copy the board address",
      viewOnExplorer: "View on Etherscan",
      viewOnExplorerLabel: "View your board address on Etherscan",
    },
    sui: {
      caption: "Sui address",
      network: "Sui Testnet",
      open: "Show your Sui address as a QR code",
      loading: "Getting your Sui address…",
      didntLoad: "Sui address didn’t load",
      title: "Your Sui address",
      qrCode: "QR code of your Sui address",
      note: "Your address on Sui Testnet.",
      copied: "Sui address copied",
      notCopied: "Couldn’t copy the Sui address",
      viewOnExplorer: "View on Suiscan",
      viewOnExplorerLabel: "View your Sui address on Suiscan",
    },
    tryAgain: "Try again",
    close: "Close",
    copy: "Copy address",
  },
  /** The Settings note, the last paper on your cork back. */
  settings: {
    title: "Settings",
    language: {
      title: "Language",
      /** `language` is LINE's, named in its own language. */
      sameAsLine: "Same as LINE ({{language}})",
      /** Each language is named in its own language. */
      names: { en: "English", ja: "日本語" },
      saving: "Saving…",
      notSaved: "Your language couldn’t be saved, so it hasn’t changed: {{reason}}",
      notKept:
        "Your language is saved, but this phone couldn’t keep it ({{reason}}). It changes the next time you open the app.",
    },
  },
  /** The developer slip: English only, so the Japanese catalog never translates it. */
  developer: {
    label: "Developer tools",
    title: "LINE and Privy",
    privy: {
      signedIn: "Signed in to Privy",
      signingIn: "Signing in to Privy…",
      failed: "Privy sign-in failed: {{reason}}",
      off: "Privy is off on the dev server, where LIFF Mock signs you in",
      tryAgain: "Try again",
    },
    gratitudeDemo: {
      title: "Gratitude mini-game",
      try: "Try the gratitude mini-game",
      drawFirst: "Draw a sticker first",
      fullEffects: "Full effects",
      showFrameTimes: "Show frame times",
    },
    performance: {
      title: "Performance",
      record: "Record performance",
      what: "Slow frames and what happened around them. While it’s on, it records from the app’s start.",
      nothingYet: "Nothing recorded yet",
      copy: "Copy report",
      clear: "Clear",
      copied: "Copied. Paste it into the chat.",
      /** It switched, but its setting wasn't kept for the next start. */
      onUntilRestart: "Recording is on until the app restarts: {{reason}}",
      offUntilRestart: "Recording is off until the app restarts: {{reason}}",
      couldntStart: "Recording couldn't start: {{reason}}",
      couldntStop: "Recording couldn't stop: {{reason}}",
      notCopied: "The report couldn't be copied: {{reason}}. It's below to copy by hand.",
      report: "Performance report",
    },
  },
} as const;
