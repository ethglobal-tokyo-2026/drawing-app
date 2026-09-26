export const app = {
  /** The page's title. */
  title: "Croquis",
  /** LINE's header shows the page title, so each screen names itself there. */
  pageTitles: {
    board: "Your sticker board",
    explore: "Explore",
    shop: "Shop",
    draw: "Draw",
  },
  tabs: {
    /** Names the tab bar for assistive tech. */
    sections: "App sections",
    myBoard: "My board",
    explore: "Explore",
    shop: "Shop",
    /** The grabber, on a screen that tucks the tabs away. */
    showTabs: "Show the My board, Explore and Shop tabs",
    /** On the grabber until it's first used: where it goes. */
    grabber: "Board",
  },
  motionPermission: {
    /** Names the sheet for assistive tech. */
    label: "Motion permission",
    question:
      "Croquis uses motion for some animations and interactions in the app. Would you like to grant permissions for motion controls?",
    allow: "Allow",
    dontAllow: "Don’t allow",
  },
} as const;
