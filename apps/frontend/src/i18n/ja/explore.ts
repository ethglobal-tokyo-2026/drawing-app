import type { Translation } from "../catalog";
import type { explore as english } from "../en/explore";

export const explore: Translation<typeof english> = {
  lifted: {
    label: "{{artist}}さんの{{no}}",
    caption: "{{no}}・<duration/>・{{day}}",
    captionGiven: "{{no}}・<duration/>・{{day}}・<receiver/>さんへ",
    goToBoard: "{{artist}}さんのシールボードへ",
    goToYourBoard: "あなたのシールボードへ",
    putBack: "もどす",
    previous: "前のシール",
    next: "次のシール",
    shown: "{{artist}}さんの{{no}}、{{setSize}}枚中{{position}}枚目",
  },
};
