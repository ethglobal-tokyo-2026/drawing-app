import type { Translation } from "../catalog";
import type { explore as english } from "../en/explore";

export const explore: Translation<typeof english> = {
  views: {
    label: "さがす",
    stickers: "シール",
    thisWeek: "今週",
  },
  pile: {
    today: "今日",
    yesterday: "昨日",
    todayBadge: "今日{{date}}",
    sticker: "{{artist}}の{{number}}、{{ago}}",
    stickerGiven: "{{artist}}の{{number}}、{{ago}}、{{receiver}}に贈られました",
    to: "<handle/>へ",
    empty: "今日さいしょに仕上がったシールが、ここに落ちてきます。",
    arrivals_other: "前に見たときから、新しいシールが{{count}}枚あります",
    ago: {
      justNow: "たった今",
      minutes: "{{minutes}}分前",
      hours: "{{hours}}時間前",
      days_other: "{{count}}日前",
    },
  },
};
