export const personSwitch = {
  /** Private person transition: persistent recovery instruction for a saved ownership operation. */
  ownershipPending: {
    en: "Finish or recover {{operation}}{{sticker}} before switching.",
    ja: "切り替える前に、{{sticker}}{{operation}}を完了するか、もう一度試してください。",
  },
  /** Private person transition: the affected sticker's number beside its unfinished operation. */
  affectedSticker: { en: " sticker {{no}}", ja: "シール{{no}}の" },
  operations: {
    /** Private person transition: unfinished Giving, including sending its Gift Message. */
    giving: { en: "giving", ja: "贈る操作" },
    /** Private person transition: unfinished Receiving. */
    receiving: { en: "receiving", ja: "受け取り" },
    /** Private person transition: unfinished Taking out from a gift bag. */
    takingOut: { en: "taking out", ja: "取り出し" },
    /** Private person transition: unfinished return of an expired gift. */
    returning: { en: "returning", ja: "返却" },
    /** Private person transition: unfinished Sealing. */
    sealing: { en: "sealing", ja: "仕上げ" },
    /** Private person transition: unfinished reserve ticket purchase. */
    buyingTickets: { en: "buying reserve tickets", ja: "有償チケットの購入" },
  },
  /** Private person controls on your stat board: section heading for server-authorized selections. */
  title: { en: "Use Croquis as", ja: "クロッキーを使う人" },
  /** Private person controls on your stat board: explicitly select the named person. */
  switchTo: { en: "Switch to {{name}}", ja: "{{name}}に切り替える" },
  /** Private person transition: shown while device saves settle and the next person is selected. */
  pending: {
    en: "Saving your changes before switching…",
    ja: "変更を保存してから切り替えています…",
  },
  /** Private person transition: persistent explanation after a failed selection or device settlement. */
  failed: {
    en: "Couldn’t switch people. {{reason}}",
    ja: "使う人を切り替えられませんでした。{{reason}}",
  },
  /** Private person transition: Reload action when the authoritative session could not be recovered. */
  reload: { en: "Reload", ja: "再読み込み" },
};
