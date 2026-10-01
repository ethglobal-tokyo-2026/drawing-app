import type { Section } from "../catalog";

export const api = {
  /** The screen that holds the app while it signs in to the app's server, and says why it couldn't. */
  signIn: {
    /** Sign-in screen, right after the LINE sign-in screen while the app signs in to its server with LINE's ID token: the status line */
    opening: { en: "Opening your sticker board…", ja: "シールボードをひらいています…" },
    /** Sign-in screen, once signing in to the app's server has taken about six seconds: the line that joins the status line to say the wait is long */
    stillOpening: {
      en: "Still opening. It’s taking longer than usual.",
      ja: "まだひらいています。<wbr/>いつもより<wbr/>時間が<wbr/>かかっています。",
    },
    /** Sign-in screen, when signing in to the app's server fails: the heading above the error's message and a Try again or Reconnect with LINE button */
    failed: { en: "Couldn’t sign you in", ja: "ログインできませんでした" },
    /** Sign-in screen, after signing in to the app's server failed for a reason other than LINE's sign-in: the button that retries it */
    tryAgain: { en: "Try again", ja: "もう一度" },
    /** Sign-in screen, when LINE's sign-in token was missing, refused or expired: the button that restarts LINE Login */
    reconnect: { en: "Reconnect with LINE", ja: "LINEで再ログイン" },
    /** Sign-in screen, after tapping Reconnect with LINE: the status line while LINE Login restarts */
    reconnecting: { en: "Reconnecting with LINE…", ja: "LINEで再ログインしています…" },
  },
  /** Asks for a handle when your LINE name couldn't become one, before the app opens. */
  handle: {
    /** Handle prompt, on a first sign-in whose LINE name couldn't become the handle, before the app opens: the heading */
    title: { en: "Pick your handle", ja: "ユーザー名を決めましょう" },
    /** Handle prompt, when LINE gave no display name: the line under the heading */
    lead: {
      en: "It’s how people find you and your stickers.",
      ja: "みんなが<wbr/>あなたや<wbr/>あなたのシールを<wbr/>見つけるときに<wbr/>使う名前です。",
    },
    /** Handle prompt, when the LINE display name ({{name}}) couldn't become the handle, because someone has it or it breaks the handle rules: the line under the heading */
    leadNameUnavailable: {
      en: "“{{name}}” isn’t available as a handle, so choose your own. It’s how people find you and your stickers.",
      ja: "「{{name}}」は<wbr/>ユーザー名として<wbr/>使えないため、<wbr/>あなただけの<wbr/>ユーザー名を<wbr/>決めてください。<wbr/>みんなが<wbr/>あなたや<wbr/>あなたのシールを<wbr/>見つけるときに<wbr/>使う名前です。",
    },
    /** Handle prompt: the handle input's accessible label, read by screen readers */
    field: { en: "Your handle", ja: "ユーザー名" },
    /** Handle prompt: the placeholder in the empty handle input, after the @ icon */
    placeholder: { en: "handle", ja: "ユーザー名" },
    /** Handle prompt, while typing: the problem line under the input once the handle is longer than {{max}} characters */
    tooLong: { en: "That’s over {{max}} characters.", ja: "{{max}}文字を超えています。" },
    /** Handle prompt, after tapping Use @handle: the problem line when the server answers handle_taken */
    taken: {
      en: "@{{handle}} is taken. Try another.",
      ja: "@{{handle}}はすでに使われています。別のユーザー名をお試しください。",
    },
    /** Handle prompt, after tapping Use @handle: the problem line when the server answers handle_invalid */
    invalid: {
      en: "A handle is 1 to {{max}} characters, without “@”.",
      ja: "ユーザー名は「@」なしの1〜{{max}}文字です。",
    },
    /** Handle prompt, after tapping Use @handle: the problem line when saving fails any other way; {{reason}} is problemOf's message */
    couldntSave: {
      en: "Couldn’t save your handle: {{reason}}",
      ja: "ユーザー名を保存できませんでした：{{reason}}",
    },
    /** Handle prompt: the submit button once a handle is typed, naming it */
    use: { en: "Use @{{handle}}", ja: "@{{handle}}にする" },
    /** Handle prompt: the submit button, disabled, while the handle input is empty */
    pick: { en: "Pick a handle", ja: "ユーザー名を決める" },
  },
  /** How screens name a person. */
  person: {
    /** Anywhere a person is named, for someone with neither a LINE name nor a handle, such as a deleted account: the name shown */
    unnamed: { en: "Someone", ja: "だれか" },
  },
} as const satisfies Section;
