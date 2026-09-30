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
    /** Reserve tickets section, under the fanned tickets: the ones you hold; `<count/>` is the reserve ticket mark and ×count */
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
    /** Reserve tickets section: the one-ticket price, while a bigger pack is discounted; `price` is in yen */
    priceWithPacks: {
      en: "{{price}} each, less in packs",
      ja: "1枚{{price}}、まとめ買いでお得",
    },
    /** Reserve tickets section: the one-ticket price, while no pack is discounted; `price` is in yen */
    price: { en: "{{price}} each", ja: "1枚{{price}}" },
    /** Reserve tickets section: the blue key that opens the reserve ticket checkout */
    buy: { en: "Buy reserve tickets", ja: "有償チケットを買う" },
  },
  /** The strip under the Shop's title for a paid pack whose tickets weren't added, which opens the reserve ticket checkout on that payment */
  unadded: {
    /** Shop, the strip under the title while this phone keeps a payment whose tickets aren't added yet: its title; the Shop tab's pip is described by it too, for screen readers */
    title: { en: "Tickets not added yet", ja: "チケットが未追加です" },
    /** Shop, that strip: the line under its title; `pack` is what was paid for, such as "3 tickets", and `price` is what it cost in yen */
    line: {
      en: "{{pack}}, {{price}}. Tap to add them; it won’t charge you twice.",
      ja: "{{pack}}（{{price}}）。タップして追加できます。二重に請求されることはありません。",
    },
    /** Shop, the strip once the server refused that payment for good: its title; the Shop tab's pip is described by it too, for screen readers */
    refusedTitle: { en: "Tickets can’t be added", ja: "チケットを追加できません" },
    /** Shop, that strip: the line under its title, since the checkout says why once; `pack` and `price` as above */
    refusedLine: {
      en: "{{pack}}, {{price}}. Tap to see why.",
      ja: "{{pack}}（{{price}}）。タップして理由を確認できます。",
    },
  },
  /** The Sui credit, under the checkout's Pay key and at the foot of the reserve tickets section; `<logo/>` is Sui's logo, which Japanese puts first */
  paymentsOn: { en: "Payments on <logo/>", ja: "<logo/>で決済" },
  /** Beside each coming-soon shelf's name: nothing on it is on sale yet */
  comingSoon: { en: "Coming soon", ja: "近日登場" },
  /** On the first swatch of each coming-soon shelf: the one you have now */
  yours: { en: "Yours", ja: "使用中" },
  /** The coming-soon shelves, each a row of four swatches */
  shelves: {
    laminates: {
      /** Laminates shelf: its name */
      title: { en: "Laminates", ja: "ラミネート" },
      /** Laminates shelf: the line under its name */
      lead: {
        en: "The finish your stickers are sealed with.",
        ja: "シールを仕上げるときの表面加工です。",
      },
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
      /** Brushes shelf: the line under its name */
      lead: { en: "More ways to lay down ink.", ja: "もっといろいろな線がかけます。" },
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
      /** Backing foils shelf: the line under its name */
      lead: {
        en: "The foil your stickers wear on other people’s sticker boards.",
        ja: "ほかの人のシールボードで、あなたのシールのふちに光るホイルです。",
      },
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
