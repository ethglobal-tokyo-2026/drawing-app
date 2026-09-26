import type { Translation } from "../catalog";
import type { shop as english } from "../en/shop";

export const shop: Translation<typeof english> = {
  title: "ショップ",
  reserve: {
    title: "有償チケット",
    lead: "無償チケットを使い切っても、かき続けられます。",
    held: "所持数<count/>",
    heldSpoken_other: "有償チケットを{{count}}枚持っています。",
    priceWithPacks: "1枚{{price}}、まとめ買いでお得",
    price: "1枚{{price}}",
    buy: "有償チケットを買う",
  },
  // Japanese puts the logo first.
  paymentsOn: "<logo/>で決済",
  comingSoon: "近日登場",
  yours: "使用中",
  shelves: {
    laminates: {
      title: "ラミネート",
      lead: "シールを仕上げるときの表面加工です。",
      items: { gloss: "グロス", matte: "マット", glitter: "ラメ", prism: "プリズム" },
    },
    brushes: {
      title: "ブラシ",
      lead: "もっといろいろな線がかけます。",
      items: { brush: "ブラシ", marker: "マーカー", fineliner: "ミリペン", pixelPen: "ドットペン" },
    },
    backingFoils: {
      title: "ホイル",
      lead: "ほかの人のシールボードで、あなたのシールのふちに光るホイルです。",
      items: { holo: "ホロ", gold: "ゴールド", silver: "シルバー", roseGold: "ローズゴールド" },
    },
  },
};
