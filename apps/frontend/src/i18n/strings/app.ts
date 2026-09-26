import type { Section } from "../catalog";

export const app = {
  /** The page's title. */
  title: { en: "Croquis", ja: "クロッキー" },
  /** LINE's header shows the page title, so each screen names itself there. */
  pageTitles: {
    board: { en: "Your sticker board" },
    explore: { en: "Explore" },
    shop: { en: "Shop" },
    draw: { en: "Draw" },
  },
  tabs: {
    /** Names the tab bar for assistive tech. */
    sections: { en: "App sections", ja: "アプリのセクション" },
    myBoard: { en: "My board", ja: "マイボード" },
    explore: { en: "Explore", ja: "さがす" },
    shop: { en: "Shop", ja: "ショップ" },
    /** The grabber, on a screen that tucks the tabs away. */
    showTabs: {
      en: "Show the My board, Explore and Shop tabs",
      ja: "マイボード・さがす・ショップのタブを出す",
    },
    /** On the grabber until it's first used: where it goes. */
    grabber: { en: "Board" },
  },
  motionPermission: {
    /** Names the sheet for assistive tech. */
    label: { en: "Motion permission" },
    question: {
      en: "Croquis uses motion for some animations and interactions in the app. Would you like to grant permissions for motion controls?",
    },
    allow: { en: "Allow" },
    dontAllow: { en: "Don’t allow" },
  },
} as const satisfies Section;
