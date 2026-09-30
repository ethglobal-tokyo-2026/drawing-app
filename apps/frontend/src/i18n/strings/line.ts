import type { Section } from "../catalog";

export const line = {
  /** The screen that holds the app until LINE has logged the person in. */
  gate: {
    /** LINE sign-in screen, while LINE (LIFF) starts up as the app opens: the status line */
    opening: { en: "Opening your sticker board…", ja: "シールボードをひらいています…" },
    /** LINE sign-in screen, once LINE (LIFF) has taken about six seconds to start: the line that joins the status line to say the wait is long */
    stillOpening: {
      en: "Still opening. It’s taking longer than usual.",
      ja: "まだひらいています。いつもより時間がかかっています。",
    },
    /** LINE sign-in screen, in a browser outside LINE before LINE Login: the heading */
    title: { en: "Your sticker board", ja: "あなたのシールボード" },
    /** LINE sign-in screen, in a browser outside LINE before LINE Login: the line under the heading */
    lead: { en: "It opens with your LINE account.", ja: "LINEアカウントでひらきます。" },
    /** LINE sign-in screen, in a browser outside LINE: the button that starts LINE Login */
    logIn: { en: "Log in with LINE", ja: "LINEでログイン" },
    /** LINE sign-in screen, when LINE (LIFF) fails to start or doesn't start in time: the heading */
    didntStart: { en: "LINE didn’t start", ja: "LINEが起動しませんでした" },
    /** LINE sign-in screen, when LINE (LIFF) fails to start: the line under the heading, above Try again and LINE's reason in fine print */
    didntStartLead: {
      en: "Your sticker board opens once it does. Check your connection, then try again.",
      ja: "起動すると、シールボードがひらきます。接続を確認して、もう一度お試しください。",
    },
    /** LINE sign-in screen, when LINE (LIFF) fails to start: the button that reloads the page */
    tryAgain: { en: "Try again", ja: "もう一度" },
    /** LINE sign-in screen, when LINE (LIFF) doesn't start in time: LINE's reason in fine print under the key, with {{seconds}} the time it was given */
    noAnswer: {
      en: "LINE didn’t answer within {{seconds}} s",
      ja: "LINEが{{seconds}}秒以内に応答しませんでした",
    },
  },
  /** The developer slip's LINE details and test message. Never translated. */
  developer: {
    checking: { en: "Checking…" },
    couldntCheck: { en: "Couldn’t check: {{reason}}" },
    none: { en: "None" },
    userId: { en: "LINE user ID" },
    name: { en: "LINE name" },
    statusMessage: { en: "Status message" },
    openedIn: {
      label: { en: "Opened in" },
      lineApp: { en: "The LINE app {{version}} on {{os}}" },
      lineAppUnknownVersion: { en: "The LINE app on {{os}}" },
      browser: { en: "A browser on {{os}}, through LINE Login" },
      unknownOs: { en: "an unknown OS" },
    },
    openedFrom: {
      label: { en: "Opened from" },
      /** By LIFF's context type. */
      contextType: {
        utou: { en: "a one-to-one chat" },
        group: { en: "a group chat" },
        room: { en: "a multi-person chat" },
        square_chat: { en: "an OpenChat" },
        none: { en: "LINE, outside any chat" },
        external: { en: "a browser" },
      },
      unknown: { en: "LINE didn’t say" },
    },
    officialAccount: {
      label: { en: "Official account" },
      friend: { en: "Added as a friend" },
      notFriend: { en: "Not a friend yet" },
    },
    chatMenu: {
      label: { en: "Chat menu" },
      waiting: { en: "Links after sign-in" },
      /** The menu linked for this open, by what its Draw key shows. */
      menus: {
        plain: { en: "Draw · My board · Explore, with no count" },
        "3": { en: "Draw with 3 daily tickets left" },
        "2": { en: "Draw with 2 daily tickets left" },
        "1": { en: "Draw with 1 daily ticket left" },
        reserve: { en: "Draw with reserve tickets" },
        none: { en: "Draw with no tickets left" },
      },
      notAFriend: { en: "Open Sticker Board: add the official account as a friend to switch" },
      /** Why the server linked nothing. */
      off: {
        not_configured: { en: "Off: the server has no Messaging API channel" },
        dev_sign_in: { en: "Off under dev sign-in" },
        no_menu: { en: "Off: no chat menu in this language yet" },
      },
      failed: { en: "Didn’t link: {{reason}}" },
    },
    permissions: { en: "Permissions" },
    idToken: {
      label: { en: "ID token" },
      expires: { en: "Expires {{time}}" },
      expired: { en: "Expired {{time}}" },
    },
    liffApp: {
      label: { en: "LIFF app" },
      value: { en: "{{id}} · SDK {{version}}" },
    },
    testMessage: {
      send: { en: "Send a test message" },
      /** Sent to the chat the person picks. */
      message: { en: "Test message from Croquis, sent by {{name}} through LINE’s friend picker." },
      pick: { en: "Pick one LINE friend and they get a test message from you." },
      unavailable: {
        en: "LINE’s friend list isn’t available here. It needs LINE Login, in LINE or a browser.",
      },
      sent: { en: "Sent. It’s in your chat with the friend you picked." },
      cancelled: { en: "Nothing sent: the friend list was closed." },
      unknown: { en: "LINE didn’t say whether it was sent." },
    },
  },
} as const satisfies Section;
