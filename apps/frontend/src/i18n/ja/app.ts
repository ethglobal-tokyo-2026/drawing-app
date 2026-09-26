import type { Translation } from "../catalog";
import type { app as english } from "../en/app";

export const app: Translation<typeof english> = {
  title: "シールボード",
  tabs: {
    sections: "アプリのセクション",
    myBoard: "マイボード",
    explore: "さがす",
    shop: "ショップ",
    showTabs: "マイボード・さがす・ショップのタブを出す",
  },
};
