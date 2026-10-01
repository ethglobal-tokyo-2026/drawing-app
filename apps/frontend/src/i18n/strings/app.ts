import type { Section } from "../catalog";

export const app = {
  /** Page title in LINE's header as the app opens, before a screen names itself: the app's name */
  title: { en: "Croquis", ja: "クロッキー" },
  /** LINE's header shows the page title, so each screen names itself there. */
  pageTitles: {
    /** Page title in LINE's header while your own sticker board is open */
    board: { en: "Your sticker board", ja: "あなたのシールボード" },
    /** Page title in LINE's header while the Explore tab is open */
    explore: { en: "Explore", ja: "さがす" },
    /** Page title in LINE's header while the Shop tab is open */
    shop: { en: "Shop", ja: "ショップ" },
    /** Page title in LINE's header while the drawing screen is open */
    draw: { en: "Draw", ja: "かく" },
  },
  tabs: {
    /** Tab bar at the bottom of every screen: its screen-reader name */
    sections: { en: "App sections", ja: "アプリのセクション" },
    /** Tab bar at the bottom of every screen: the tab for your own sticker board */
    myBoard: { en: "My board", ja: "マイボード" },
    /** Tab bar at the bottom of every screen: the tab for Explore, where you find other people's stickers and boards */
    explore: { en: "Explore", ja: "さがす" },
    /** Tab bar at the bottom of every screen: the tab for the Shop, where tickets are bought */
    shop: { en: "Shop", ja: "ショップ" },
    /** Drawing screen, which tucks the tab bar away: screen-reader label of the grabber at the bottom that brings the tabs back */
    showTabs: {
      en: "Show the My board, Explore and Shop tabs",
      ja: "マイボード・さがす・ショップのタブを出す",
    },
    /** Drawing screen: text on the grabber at the bottom until it's first used, saying where it leads */
    grabber: { en: "Board", ja: "ボード" },
  },
  /** Drawing screen, when Draw is tapped before its code has loaded: what screen readers hear while it loads */
  drawingLoading: { en: "Opening the drawing screen", ja: "かく画面を読み込んでいます" },
  crash: {
    /** The page that takes the app's place when a screen fails as it shows: its heading */
    title: { en: "Croquis stopped", ja: "クロッキーが止まりました" },
    /** The same page: the line under the heading, over the error's words */
    lead: {
      en: "Something on this screen went wrong. Reload to start again.",
      ja: "この画面で問題が起きました。再読み込みして、もう一度お試しください。",
    },
    /** The same page: the key that reloads the page */
    reload: { en: "Reload", ja: "再読み込み" },
  },
  motionPermission: {
    /** Motion permission card, shown once over the app on iPhone: its screen-reader name */
    label: { en: "Motion permission", ja: "モーションの許可" },
    /** Motion permission card, shown once over the app on iPhone: the question it asks, naming what shaking does and that iPhone asks once more after Allow */
    question: {
      en: "Shake your phone to send gratitude? After you allow it, iPhone asks once more.",
      ja: "端末を振って感謝を送りませんか？許可すると、iPhoneがもう一度確認します。",
    },
    /** Motion permission card: the key that grants motion access, after which iOS shows its own prompt */
    allow: { en: "Allow", ja: "許可する" },
    /** Motion permission card: the quiet link under Allow that declines */
    dontAllow: { en: "Don’t allow", ja: "許可しない" },
  },
} as const satisfies Section;
