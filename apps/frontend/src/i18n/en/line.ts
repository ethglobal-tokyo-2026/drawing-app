export const line = {
  /** The screen that holds the app until LINE has logged the person in. */
  gate: {
    opening: "Opening your sticker board…",
    title: "Your sticker board",
    lead: "It opens with your LINE account.",
    logIn: "Log in with LINE",
    didntStart: "LINE didn’t start",
    didntStartLead: "Your sticker board opens once it does. Check your connection, then try again.",
    tryAgain: "Try again",
  },
  /** The developer slip's LINE details and test message. Never translated. */
  developer: {
    checking: "Checking…",
    couldntCheck: "Couldn’t check: {{reason}}",
    none: "None",
    userId: "LINE user ID",
    name: "LINE name",
    statusMessage: "Status message",
    openedIn: {
      label: "Opened in",
      lineApp: "The LINE app {{version}} on {{os}}",
      lineAppUnknownVersion: "The LINE app on {{os}}",
      browser: "A browser on {{os}}, through LINE Login",
      unknownOs: "an unknown OS",
    },
    openedFrom: {
      label: "Opened from",
      /** By LIFF's context type. */
      contextType: {
        utou: "a one-to-one chat",
        group: "a group chat",
        room: "a multi-person chat",
        square_chat: "an OpenChat",
        none: "LINE, outside any chat",
        external: "a browser",
      },
      unknown: "LINE didn’t say",
    },
    officialAccount: {
      label: "Official account",
      friend: "Added as a friend",
      notFriend: "Not a friend yet",
    },
    chatMenu: {
      label: "Chat menu",
      waiting: "Links after sign-in",
      /** The menu linked for this open, by what its Draw key shows. */
      menus: {
        plain: "Draw · My board · Explore, with no count",
        "3": "Draw with 3 daily tickets left",
        "2": "Draw with 2 daily tickets left",
        "1": "Draw with 1 daily ticket left",
        reserve: "Draw with reserve tickets",
        none: "Draw with no tickets left",
      },
      notAFriend: "Open Sticker Board: add the official account as a friend to switch",
      /** Why the server linked nothing. */
      off: {
        not_configured: "Off: the server has no Messaging API channel",
        dev_sign_in: "Off under dev sign-in",
        no_menu: "Off: no chat menu in this language yet",
      },
      failed: "Didn’t link: {{reason}}",
    },
    permissions: "Permissions",
    idToken: {
      label: "ID token",
      expires: "Expires {{time}}",
      expired: "Expired {{time}}",
    },
    liffApp: {
      label: "LIFF app",
      value: "{{id}} · SDK {{version}}",
    },
    testMessage: {
      send: "Send a test message",
      /** Sent to the chat the person picks. */
      message: "Test message from Croquis, sent by {{name}} through LINE’s friend picker.",
      pick: "Pick one LINE friend and they get a test message from you.",
      unavailable:
        "LINE’s friend list isn’t available here. It needs LINE Login, in LINE or a browser.",
      sent: "Sent. It’s in your chat with the friend you picked.",
      cancelled: "Nothing sent: the friend list was closed.",
    },
  },
} as const;
