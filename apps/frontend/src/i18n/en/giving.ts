export const giving = {
  tag: { from: "From", for: "For" },
  giftMessage: {
    altText: "{{name}} sent you a sticker",
    oneOfOne: "ONE OF ONE",
    body: "A one-of-one sticker, drawn in {{duration}}. It opens once.",
    open: "Open your gift",
  },
  /** "Can’t find them?", in the give sheet's place: for a friend LINE's picker leaves out. */
  cantFind: {
    title: "Can’t find them?",
    back: "Back",
    lead: "LINE’s list leaves out anyone who turned off sharing with apps, and friends you added in the last few minutes.",
    notFriends: "Not friends in LINE yet?",
    notFriendsHint: "Add them in LINE first and say hi. Then come back and pick them.",
    addFriendsDidntOpen: "LINE’s Add friends screen didn’t open: {{reason}}",
  },
} as const;
