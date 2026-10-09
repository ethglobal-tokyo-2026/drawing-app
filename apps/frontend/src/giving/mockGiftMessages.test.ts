// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LiffPicker } from "../line/friendPicker";
import { buildGiftMessage } from "./giftMessage";
import { liffGiftSender } from "./giftSender";
import { takeMockGiftMessage } from "./mockGiftMessages";

// LIFF Mock answers for LINE even where a real-LINE .env switches it off.
vi.mock("../line/liff", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../line/liff")>()),
  liffMockActive: true,
}));

/** LIFF Mock's picker, answering as LINE does when the person sends, or backs out with nothing. */
const picker = (answer: { status: "success" } | undefined): LiffPicker => ({
  isApiAvailable: () => true,
  shareTargetPicker: () => Promise.resolve(answer),
  isInClient: () => false,
  getLineVersion: () => null,
});

const giftMessage = (giftClaimToken: string) =>
  buildGiftMessage({
    liffId: "test-liff",
    giftClaimToken,
    fromHandle: "alice",
    no: 1,
    timeUsed: 60,
    language: "en",
  });

afterEach(() => sessionStorage.clear());

describe("LIFF Mock's Gift Messages", () => {
  it("keeps the Gift Messages its picker sent, oldest first, and none it backed out of", async () => {
    await liffGiftSender(picker({ status: "success" }))?.send(giftMessage("0xfirst"));
    await liffGiftSender(picker(undefined))?.send(giftMessage("0xcancelled"));
    await liffGiftSender(picker({ status: "success" }))?.send(giftMessage("0xsecond"));
    expect([takeMockGiftMessage(), takeMockGiftMessage(), takeMockGiftMessage()]).toEqual([
      "/g/0xfirst",
      "/g/0xsecond",
      null,
    ]);
  });
});
