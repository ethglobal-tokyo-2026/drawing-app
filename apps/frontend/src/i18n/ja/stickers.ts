import type { Translation } from "../catalog";
import type { stickers as english } from "../en/stickers";

export const stickers: Translation<typeof english> = {
  duration: {
    minutesAndSeconds: "{{minutes}}分{{seconds}}秒",
    minutes: "{{minutes}}分",
    seconds: "{{seconds}}秒",
  },
  spokenDuration: {
    minutesAndSeconds: "{{minutes}}{{seconds}}",
    minutes_other: "{{count}}分",
    seconds_other: "{{count}}秒",
  },
};
