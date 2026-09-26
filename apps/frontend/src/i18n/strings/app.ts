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
    /** Page title in LINE's header while the Shop tab, the ticket shop, is open */
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
  motionPermission: {
    /** Motion permission card, shown once over the app on iPhone: its screen-reader name */
    label: { en: "Motion permission", ja: "モーションの許可" },
    /** Motion permission card, shown once over the app on iPhone: the question it asks */
    question: {
      en: "Croquis uses motion for some animations and interactions in the app. Would you like to grant permissions for motion controls?",
      ja: "クロッキーでは、一部のアニメーションや操作に端末の動きを使います。モーションセンサーの使用を許可しますか？",
    },
    /** Motion permission card: the key that grants motion access, after which iOS shows its own prompt */
    allow: { en: "Allow", ja: "許可する" },
    /** Motion permission card: the quiet link under Allow that declines */
    dontAllow: { en: "Don’t allow", ja: "許可しない" },
  },
} as const satisfies Section;
