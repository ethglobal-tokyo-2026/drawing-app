import type { Section } from "../catalog";

export const giving = {
  tag: { from: { en: "From" }, for: { en: "For" } },
  giftMessage: {
    altText: { en: "{{name}} sent you a sticker", ja: "{{name}}からシールが届きました" },
    oneOfOne: { en: "ONE OF ONE" },
    body: { en: "A one-of-one sticker, drawn in {{duration}}. It opens once." },
    open: { en: "Open your gift", ja: "ギフトをひらく" },
  },
  /** Giving's title, and the give sheet's key once a sticker is picked. */
  give: { en: "Give {{no}}" },
  close: { en: "Close" },
  backToBoard: { en: "Back to my sticker board" },
  /** Giving from someone else's sticker board: picking one of yours first. */
  giveSheet: {
    title: { en: "Give {{name}} a sticker" },
    lead: { en: "Pick one of yours, then send it to {{name}} in a LINE chat." },
    /** Names the grid of your stickers for assistive tech. */
    yourStickers: { en: "Your stickers" },
    none: { en: "You don’t have a sticker to give yet. Draw one on your board first." },
    noPicker: {
      en: "LINE’s friend picker isn’t available here, so gifts can’t be sent from this screen.",
    },
    pick: { en: "Pick a sticker" },
  },
  /** The sticker's fine print, over Giving's sheet: `<name/>` is the giver's handle. */
  meta: { en: "{{no}} · <duration/> · {{day}} · <name/>" },
  /** Giving's first screen: how the sticker goes out. */
  sheet: {
    sendInChat: { en: "Send in a LINE chat" },
    sendInChatHint: { en: "Pick your chat with them. The first to open it gets it." },
    leaves: { en: "It comes off your board and into a gift bag." },
  },
  /** "Can’t find them?", in the give sheet's place: for a friend LINE's picker leaves out. */
  cantFind: {
    title: { en: "Can’t find them?" },
    back: { en: "Back" },
    lead: {
      en: "LINE’s list leaves out anyone who turned off sharing with apps, and friends you added in the last few minutes.",
    },
    notFriends: { en: "Not friends in LINE yet?" },
    notFriendsHint: { en: "Add them in LINE first and say hi. Then come back and pick them." },
    addFriendsDidntOpen: { en: "LINE’s Add friends screen didn’t open: {{reason}}" },
  },
  /** The sticker in the open bag, until it's sent or taken out. */
  inTheBag: {
    title: { en: "In the bag" },
    lead: {
      en: "It seals when it’s sent. Pick your chat with them in LINE: whoever opens it first gets it.",
    },
    notSent: { en: "Not sent yet" },
    notSentLead: { en: "It’s still in the bag, unsealed. Pick a chat again, or take it out." },
    send: { en: "Send in LINE" },
    takeOut: { en: "Take it out" },
    couldntPack: { en: "{{no}} couldn’t be packed: {{reason}}" },
    wasntSent: { en: "{{no}} wasn’t sent: {{reason}}" },
    couldntTakeOut: { en: "{{no}} couldn’t be taken out: {{reason}}" },
    couldntRecord: { en: "The app’s server couldn’t record that: {{reason}}" },
  },
  sent: {
    title: { en: "Sealed and sent" },
    lead: {
      en: "It’s in your LINE chat now, and the gift message opens once. When they receive it, you’ll see who did.",
    },
    couldntRecord: {
      en: "It went out in LINE, but the app’s server couldn’t record it: {{reason}}",
    },
  },
  /** The frosted gift bag. */
  giftBag: {
    /** Names the bag's picture for assistive tech, by its state. */
    pictured: {
      open: { en: "The sticker in an open gift bag" },
      sealed: { en: "The gift bag, sealed" },
      torn: { en: "The gift bag, torn open" },
      opened: { en: "The gift bag, open and empty" },
    },
    /** The picture's name, with the tag's word and name: "tagged From @alice". */
    tagged: { en: "{{pictured}}, tagged {{label}} {{name}}" },
    /** The same, with the stamp inked on the tag. */
    taggedAndStamped: { en: "{{pictured}}, tagged {{label}} {{name}}, stamped {{stamp}}" },
    /** Printed along the tear tape. */
    sealed: { en: "<b>Sealed</b> {{date}}" },
    /** The pull tab, as a slider for assistive tech. */
    pullTab: { en: "Pull the tab to open the gift" },
    /** Printed on the pull tab. */
    pull: { en: "Pull" },
    /** The rubber stamps inked on the tag, by stamp: big words, some under a small line. */
    stamps: {
      "one-to-one": { small: { en: "Opens only in" }, big: { en: "1:1 chat" } },
      opened: { big: { en: "Opened" } },
      "taken-back": { big: { en: "Taken back" } },
      returned: { big: { en: "Returned" } },
    },
  },
  /** The giver's moment once a gift is received. */
  receivedNotice: {
    title: { en: "{{name}} received your sticker ♡" },
    lead: { en: "It’s on {{name}}’s sticker board now." },
    /** Beside the sticker's silhouette: who has it now, and since when. */
    caption: { en: "{{name}} · {{date}}" },
  },
  /** Your gifts on their way, in clear film. */
  pendingGifts: {
    onTheirWay_one: { en: "On its way" },
    onTheirWay_other: { en: "On their way" },
    /** The newest gift, and how many more are on their way behind it. */
    andMore: { en: "{{no}} and {{count}} more" },
    /** Who a gift given in the app went to. */
    to: { en: "to {{name}}" },
    /** Names the badge for assistive tech. */
    label: {
      one: { en: "Gifts on their way: {{no}}" },
      oneTo: { en: "Gifts on their way: {{no}} to {{name}}" },
      several: { en: "{{count}} gifts on their way" },
    },
  },
} as const satisfies Section;
