export const giving = {
  tag: { from: "From", for: "For" },
  depositUnconfirmed:
    "The Sticker transfer could not be confirmed. Tap Send in LINE to check the gift again.",
  takeOutUnconfirmed:
    "Taking out the Sticker could not be confirmed. Check the gift in the app before trying again.",
  giftMessage: {
    altText: "{{name}} sent you a sticker",
    oneOfOne: "ONE OF ONE",
    body: "A one-of-one sticker, drawn in {{duration}}. It opens once.",
    open: "Open your gift",
  },
  /** Giving's title, and the give sheet's key once a sticker is picked. */
  give: "Give {{no}}",
  close: "Close",
  backToBoard: "Back to my sticker board",
  /** Giving from someone else's sticker board: picking one of yours first. */
  giveSheet: {
    title: "Give {{name}} a sticker",
    lead: "Pick one of yours, then send it to {{name}} in a LINE chat.",
    /** Names the grid of your stickers for assistive tech. */
    yourStickers: "Your stickers",
    none: "You don’t have a sticker to give yet. Draw one on your board first.",
    noPicker: "LINE’s friend picker isn’t available here, so gifts can’t be sent from this screen.",
    pick: "Pick a sticker",
  },
  /** The sticker's fine print, over Giving's sheet: `<name/>` is the giver's handle. */
  meta: "{{no}} · <duration/> · {{day}} · <name/>",
  /** Giving's first screen: how the sticker goes out. */
  sheet: {
    sendInChat: "Send in a LINE chat",
    sendInChatHint: "Pick your chat with them. The first to open it gets it.",
    leaves: "It comes off your board and into a gift bag.",
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
  /** The sticker in the open bag, until it's sent or taken out. */
  inTheBag: {
    title: "In the bag",
    lead: "It seals when it’s sent. Pick your chat with them in LINE: whoever opens it first gets it.",
    notSent: "Not sent yet",
    notSentLead: "It’s still in the bag, unsealed. Pick a chat again, or take it out.",
    send: "Send in LINE",
    takeOut: "Take it out",
    couldntPack: "{{no}} couldn’t be packed: {{reason}}",
    wasntSent: "{{no}} wasn’t sent: {{reason}}",
    couldntTakeOut: "{{no}} couldn’t be taken out: {{reason}}",
    couldntRecord: "The app’s server couldn’t record that: {{reason}}",
  },
  sent: {
    title: "Sealed and sent",
    lead: "It’s in your LINE chat now, and the gift message opens once. When they receive it, you’ll see who did.",
    couldntRecord: "It went out in LINE, but the app’s server couldn’t record it: {{reason}}",
  },
  /** The frosted gift bag. */
  giftBag: {
    /** Names the bag's picture for assistive tech, by its state. */
    pictured: {
      open: "The sticker in an open gift bag",
      sealed: "The gift bag, sealed",
      torn: "The gift bag, torn open",
      opened: "The gift bag, open and empty",
    },
    /** The picture's name, with the tag's word and name: "tagged From @alice". */
    tagged: "{{pictured}}, tagged {{label}} {{name}}",
    /** The same, with the stamp inked on the tag. */
    taggedAndStamped: "{{pictured}}, tagged {{label}} {{name}}, stamped {{stamp}}",
    /** Printed along the tear tape. */
    sealed: "<b>Sealed</b> {{date}}",
    /** The pull tab, as a slider for assistive tech. */
    pullTab: "Pull the tab to open the gift",
    /** Printed on the pull tab. */
    pull: "Pull",
    /** The rubber stamps inked on the tag, by stamp: big words, some under a small line. */
    stamps: {
      "one-to-one": { small: "Opens only in", big: "1:1 chat" },
      opened: { big: "Opened" },
      "taken-back": { big: "Taken back" },
      returned: { big: "Returned" },
    },
  },
  /** The giver's moment once a gift is received. */
  receivedNotice: {
    title: "{{name}} received your sticker ♡",
    lead: "It’s on {{name}}’s sticker board now.",
    /** Beside the sticker's silhouette: who has it now, and since when. */
    caption: "{{name}} · {{date}}",
  },
  /** Your gifts on their way, in clear film. */
  pendingGifts: {
    onTheirWay_one: "On its way",
    onTheirWay_other: "On their way",
    /** The newest gift, and how many more are on their way behind it. */
    andMore: "{{no}} and {{count}} more",
    /** Who a gift given in the app went to. */
    to: "to {{name}}",
    /** Names the badge for assistive tech. */
    label: {
      one: "Gifts on their way: {{no}}",
      oneTo: "Gifts on their way: {{no}} to {{name}}",
      several: "{{count}} gifts on their way",
    },
  },
} as const;
