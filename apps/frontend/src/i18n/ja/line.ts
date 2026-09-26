import type { Translation } from "../catalog";
import type { line as english } from "../en/line";

export const line: Translation<typeof english> = {
  gate: {
    opening: "シールボードをひらいています…",
    title: "あなたのシールボード",
    lead: "LINEアカウントでひらきます。",
    logIn: "LINEでログイン",
    didntStart: "LINEが起動しませんでした",
    didntStartLead:
      "起動すると、シールボードがひらきます。接続を確認して、もう一度お試しください。",
    tryAgain: "もう一度",
  },
};
