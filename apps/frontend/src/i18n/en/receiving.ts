export const receiving = {
  termsLine:
    "Receiving it shows {{name}} your LINE name and picture. You agree to the <terms>Terms</terms> and <privacy>Privacy Policy</privacy>.",
  /**
   * A gift that can't be received here: a title and one line, by refusal. The `_unknownGiver`
   * text is for a refusal that came without the giver, so it says "the giver".
   */
  refusals: {
    groupChat: {
      title: "Open this in your chat with {{name}}",
      title_unknownGiver: "Open this in your chat with the giver",
      line: "Gifts open only in the private chat they were sent to. If {{name}} sent it to you, open it there.",
      line_unknownGiver:
        "Gifts open only in the private chat they were sent to. If the giver sent it to you, open it there.",
    },
    /** Never who received it: anyone holding a forwarded link would see. */
    alreadyReceived: {
      title: "Already opened",
      line: "Each gift message opens once. If it was you, the sticker’s on your sticker board.",
    },
    ownGift: {
      title: "This gift is on its way",
      line: "Only the friend you sent it to can open it.",
    },
    takenBack: {
      title: "{{name}} took this one back",
      title_unknownGiver: "The giver took this one back",
      line: "It went back to their sticker board before anyone received it.",
    },
    /** Returned, or expired: either way it's back with the giver. */
    giftReturned: {
      title: "This one went back to {{name}}",
      title_unknownGiver: "This one went back to the giver",
      line: "Gifts wait a week. This one wasn’t opened in time, so it’s back on their sticker board.",
    },
    notDeposited: {
      title: "Almost here",
      line: "This gift is still on its way. Try again in a few seconds.",
    },
    giftNotFound: {
      title: "This link doesn’t open a gift",
      line: "Open it again from the gift message in your chat.",
    },
    needsServer: {
      title: "Gifts can’t be opened yet",
      line: "Opening a gift needs the app’s server, which isn’t running yet.",
    },
  },
  /** A preview that failed; the line under it says what failed. */
  previewFailed: "Couldn’t open the gift",
} as const;
