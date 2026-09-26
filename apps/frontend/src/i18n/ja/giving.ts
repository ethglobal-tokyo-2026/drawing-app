import type { Translation } from "../catalog";
import type { giving as english } from "../en/giving";

export const giving: Translation<typeof english> = {
  giftMessage: { altText: "{{name}}からシールが届きました", open: "ギフトをひらく" },
};
