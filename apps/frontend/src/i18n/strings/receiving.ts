import type { Section } from "../catalog";

export const receiving = {
  /** Names the dialog, and LINE's header while it's open. `_unknownGiver` is before the preview names them. */
  title: { en: "A gift from {{name}}" },
  title_unknownGiver: { en: "A gift" },
  /** The gift itself: the sealed bag and its pull tab, then the reveal and Accept. */
  gift: {
    title: { en: "{{name}} sent you a sticker" },
    /** Under the sealed bag, over two lines: the pull tab, then the other ways to open it. */
    pullTabHint: {
      en: "<b>Pull the tab to open it</b><span>or double-tap, or press and hold</span>",
    },
    /** Names the Accept sheet for assistive tech. */
    acceptSheet: { en: "Accept this sticker" },
    /** Names the person opening it: `<name/>` is their LINE name, in bold. */
    forYou: { en: "This sticker is for you, <name/>." },
    /** The sticker's number, drawing time, seal day and Original Artist, `<artist/>`. */
    finePrint: { en: "{{no}} · <duration/> · {{day}} · by <artist/>" },
    notReceived: { en: "{{no}} wasn’t received. {{reason}} Tap Accept to try again." },
    accept: { en: "Accept" },
    accepting: { en: "Accepting…" },
    notNow: { en: "Not now" },
  },
  /** Under Accept: `<name/>` is the giver. */
  termsLine: {
    en: "Receiving it shows <name/> your LINE name and picture. You agree to the <terms>Terms</terms> and <privacy>Privacy Policy</privacy>.",
  },
  /**
   * A gift that can't be received here: a title and one line, by refusal. The `_unknownGiver`
   * text is for a refusal that came without the giver, so it says "the giver".
   */
  refusals: {
    groupChat: {
      title: { en: "Open this in your chat with {{name}}" },
      title_unknownGiver: { en: "Open this in your chat with the giver" },
      line: {
        en: "Gifts open only in the private chat they were sent to. If {{name}} sent it to you, open it there.",
      },
      line_unknownGiver: {
        en: "Gifts open only in the private chat they were sent to. If the giver sent it to you, open it there.",
      },
    },
    /** Never who received it: anyone holding a forwarded link would see. */
    alreadyReceived: {
      title: { en: "Already opened", ja: "開封済み" },
      line: {
        en: "Each gift message opens once. If it was you, the sticker’s on your sticker board.",
        ja: "ギフトメッセージをひらけるのは一度だけです。あなたがひらいたなら、シールはシールボードにあります。",
      },
    },
    ownGift: {
      title: { en: "This gift is on its way" },
      line: { en: "Only the friend you sent it to can open it." },
    },
    takenBack: {
      title: { en: "{{name}} took this one back" },
      title_unknownGiver: { en: "The giver took this one back" },
      line: { en: "It went back to their sticker board before anyone received it." },
    },
    /** Returned, or expired: either way it's back with the giver. */
    giftReturned: {
      title: { en: "This one went back to {{name}}" },
      title_unknownGiver: { en: "This one went back to the giver" },
      line: {
        en: "Gifts wait a week. This one wasn’t opened in time, so it’s back on their sticker board.",
      },
    },
    notDeposited: {
      title: { en: "Almost here" },
      line: { en: "This gift is still on its way. Try again in a few seconds." },
    },
    giftNotFound: {
      title: { en: "This link doesn’t open a gift" },
      line: { en: "Open it again from the gift message in your chat." },
    },
    needsServer: {
      title: { en: "Gifts can’t be opened yet" },
      line: { en: "Opening a gift needs the app’s server, which isn’t running yet." },
    },
  },
  /** A preview that failed, and the line for a preview that came back without what it needed. */
  previewFailed: {
    title: { en: "Couldn’t open the gift" },
    withoutSticker: { en: "The gift's preview came without its sticker." },
    withoutRefusal: { en: "The gift's preview refused it without saying why." },
  },
  /** The ways on from a gift that can't be received here. */
  backToLine: { en: "Back to LINE" },
  goToStickerBoard: { en: "Go to my sticker board" },
  tryAgain: { en: "Try again" },
  /** Asks, once a received sticker is on the board, whether to send its giver gratitude now. */
  sendGratitude: {
    title: { en: "Send {{name}} gratitude?" },
    line: { en: "It’s on your board, from {{name}}. Gratitude never expires." },
    /** When the giver, `<name/>`, is the sticker's Original Artist. */
    lineFromOriginalArtist: {
      en: "It’s on your board. <name/> drew it in <duration/>, and gratitude never expires.",
    },
    send: { en: "Send gratitude" },
    later: { en: "Later" },
  },
} as const satisfies Section;
