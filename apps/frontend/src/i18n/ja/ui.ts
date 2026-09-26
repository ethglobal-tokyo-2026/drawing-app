import type { Translation } from "../catalog";
import type { ui as english } from "../en/ui";

export const ui: Translation<typeof english> = {
  hitCounter: {
    unit_other: "ヒット",
    spoken_other: "{{hits}}ヒット",
  },
};
