import type { Translation } from "../catalog";
import type { receiving as english } from "../en/receiving";

export const receiving: Translation<typeof english> = {
  refusals: {
    alreadyReceived: {
      title: "開封済み",
      line: "ギフトメッセージをひらけるのは一度だけです。あなたがひらいたなら、シールはシールボードにあります。",
    },
  },
};
