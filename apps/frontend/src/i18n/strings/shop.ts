import type { Section } from "../catalog";

export const shop = {
  /** The Shop tab: the page's title */
  title: { en: "Shop", ja: "ショップ" },
  /** The Shop's reserve tickets section, the one thing on sale */
  reserve: {
    /** Reserve tickets section: its headline, under the fanned tickets */
    title: { en: "Reserve tickets", ja: "有償チケット" },
    /** Reserve tickets section: the one line under the headline, on what they're for */
    lead: {
      en: "Keep drawing after your daily tickets run out.",
      ja: "無償チケットを<wbr/>使い切っても、<wbr/>かき続けられます。",
    },
    /** Reserve tickets section, over the Buy key: the ones you hold; `<count/>` is the reserve ticket mark and ×count */
    held: { en: "You have <count/>", ja: "所持数<count/>" },
    /** Reserve tickets section: what the line above says, for screen readers, when you hold one */
    heldSpoken_one: { en: "You have {{count}} reserve ticket." },
    /** Reserve tickets section: what the line above says, for screen readers */
    heldSpoken_other: {
      en: "You have {{count}} reserve tickets.",
      ja: "有償チケットを{{count}}枚持っています。",
    },
    /** Reserve tickets section, in the held tickets' place, when your tickets didn't load, so the Shop can't say how many you hold; `reason` is why, in the app's language, before a Try again link */
    heldProblem: {
      en: "Couldn’t load your tickets: {{reason}}",
      ja: "チケットを読み込めませんでした：{{reason}}",
    },
    /** Reserve tickets section: the blue key that opens the reserve ticket checkout */
    buy: { en: "Buy reserve tickets", ja: "有償チケットを買う" },
    /** Reserve tickets section, under the Buy key: the label button that holds up your Sui address and its QR code, to send JPYC to */
    deposit: { en: "Deposit", ja: "入金" },
  },
  /** The Shop: the one pill over the coming-soon shelves, saying nothing on them is on sale yet */
  comingSoon: { en: "Coming soon", ja: "近日登場" },
  /** On the first swatch of each coming-soon shelf: the one you have now */
  yours: { en: "Yours", ja: "使用中" },
  /** The coming-soon shelves, each a row of four swatches */
  shelves: {
    laminates: {
      /** Laminates shelf: its name */
      title: { en: "Laminates", ja: "ラミネート" },
      items: {
        /** Laminates shelf: the first swatch's name, the laminate every sticker is sealed with now */
        gloss: { en: "Gloss", ja: "グロス" },
        /** Laminates shelf: the matte laminate swatch's name, coming soon */
        matte: { en: "Matte", ja: "マット" },
        /** Laminates shelf: the glitter laminate swatch's name, coming soon */
        glitter: { en: "Glitter", ja: "ラメ" },
        /** Laminates shelf: the prism laminate swatch's name, coming soon */
        prism: { en: "Prism", ja: "プリズム" },
      },
    },
    brushes: {
      /** Brushes shelf: its name */
      title: { en: "Brushes", ja: "ブラシ" },
      items: {
        /** Brushes shelf: the first swatch's name, the brush the drawing screen has now */
        brush: { en: "Brush", ja: "ブラシ" },
        /** Brushes shelf: the marker swatch's name, coming soon */
        marker: { en: "Marker", ja: "マーカー" },
        /** Brushes shelf: the fineliner swatch's name, coming soon */
        fineliner: { en: "Fineliner", ja: "ミリペン" },
        /** Brushes shelf: the pixel pen swatch's name, coming soon */
        pixelPen: { en: "Pixel pen", ja: "ドットペン" },
      },
    },
    backingFoils: {
      /** Backing foils shelf: its name */
      title: { en: "Backing foils", ja: "ホイル" },
      items: {
        /** Backing foils shelf: the first swatch's name, the foil every sticker wears now */
        holo: { en: "Holo", ja: "ホロ" },
        /** Backing foils shelf: the gold foil swatch's name, coming soon */
        gold: { en: "Gold", ja: "ゴールド" },
        /** Backing foils shelf: the silver foil swatch's name, coming soon */
        silver: { en: "Silver", ja: "シルバー" },
        /** Backing foils shelf: the rose gold foil swatch's name, coming soon */
        roseGold: { en: "Rose gold", ja: "ローズゴールド" },
      },
    },
  },
} as const satisfies Section;
