import type { Section } from "../catalog";

export const app = {
  /** Page title in LINE's header as the app opens, before a screen names itself: the app's name */
  title: { en: "Croquis", ja: "クロッキー" },
  /** LINE's header shows the page title, so each screen names itself there. */
  pageTitles: {
    /** Page title in LINE's header while your own sticker board is open */
    board: { en: "Your sticker board", ja: "あなたのシールボード" },
    /** Page title in LINE's header while the Explore tab is open */
    explore: { en: "Explore", ja: "発見" },
    /** Page title in LINE's header while the Shop tab is open */
    shop: { en: "Shop", ja: "ショップ" },
    /** Page title in LINE's header while the drawing screen is open */
    draw: { en: "Draw", ja: "かく" },
  },
  tabs: {
    /** Tab bar at the bottom of every screen but the drawing screen: its screen-reader name */
    sections: { en: "App sections", ja: "アプリのセクション" },
    /** Tab bar at the bottom of every screen but the drawing screen: the tab for your own sticker board */
    myBoard: { en: "My board", ja: "マイボード" },
    /** Tab bar at the bottom of every screen but the drawing screen: the tab for Explore, where you find other people's stickers and boards */
    explore: { en: "Explore", ja: "発見" },
    /** Tab bar on a large screen, while someone else's sticker board is open over Explore: screen readers' name for the lit Explore tab, which goes back to Explore */
    backToExplore: { en: "Back to Explore", ja: "発見に戻る" },
    /** Tab bar at the bottom of every screen but the drawing screen: the tab for the Shop, where tickets are bought */
    shop: { en: "Shop", ja: "ショップ" },
  },
  /** Drawing screen, when Draw is tapped before its code has loaded: what screen readers hear while it loads */
  drawingLoading: { en: "Opening the drawing screen", ja: "かく画面を読み込んでいます" },
  crash: {
    /** The page that takes the app's place when a screen fails as it shows: its heading */
    title: { en: "Croquis stopped", ja: "クロッキーが止まりました" },
    /** The same page: the line under the heading, over the error's words */
    lead: {
      en: "Something on this screen went wrong. Reload to try again.",
      ja: "この画面で問題が起きました。再読み込みして、もう一度お試しください。",
    },
    /** The same page: the key that reloads the page */
    reload: { en: "Reload", ja: "再読み込み" },
  },
  motionPermission: {
    /** Motion permission card, shown once over the app on iPhone and iPad: its screen-reader name */
    label: { en: "Motion permission", ja: "モーションの許可" },
    /** Motion permission card, shown once over the app on iPhone and iPad: the question it asks, naming what shaking does and that the system asks once more after Allow */
    question: {
      en: "Shake to send gratitude? After you allow it, you’ll be asked once more.",
      ja: "端末を振って感謝を送りませんか？許可すると、もう一度確認が表示されます。",
    },
    /** Motion permission card: the key that grants motion access, after which iOS or iPadOS shows its own prompt */
    allow: { en: "Allow", ja: "許可する" },
    /** Motion permission card: the quiet link under Allow that declines */
    dontAllow: { en: "Don’t allow", ja: "許可しない" },
  },
} as const satisfies Section;
