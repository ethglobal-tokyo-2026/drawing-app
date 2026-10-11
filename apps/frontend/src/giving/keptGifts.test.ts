// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { refusingStorage } from "../ui/testing";
import { forgetKeptGift, keepGift, keptGift, keptReports } from "./keptGifts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("keeps reports in memory per person when device writes fail", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("localStorage", refusingStorage);
  const attemptId = `0x${"12".repeat(32)}`;
  expect(keepGift("quota-giver", "gift", { message: "sent", attemptId })).toBe(false);
  expect(keptGift("quota-giver", "gift")).toEqual({ message: "sent", attemptId });
  expect(keptGift("other-giver", "gift")).toBeNull();
  forgetKeptGift("quota-giver", "gift");
  expect(keptGift("quota-giver", "gift")).toBeNull();
});

it("keeps an unresolved cancellation when both reading and writing storage are blocked", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("localStorage", {
    ...refusingStorage,
    getItem: () => {
      throw new Error("blocked");
    },
  });
  const attemptId = `0x${"34".repeat(32)}`;
  expect(keepGift("blocked-giver", "gift", { message: "cancelled", attemptId })).toBe(false);
  expect(keptGift("blocked-giver", "gift")).toEqual({ message: "cancelled", attemptId });
  forgetKeptGift("blocked-giver", "gift");
});

it("retains a successfully saved report in memory if storage later refuses reads", () => {
  const attemptId = `0x${"56".repeat(32)}`;
  expect(keepGift("later-blocked-giver", "gift", { message: "sent", attemptId })).toBe(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("localStorage", {
    ...refusingStorage,
    getItem: () => {
      throw new Error("Reads became blocked");
    },
  });
  expect(keptGift("later-blocked-giver", "gift")).toEqual({ message: "sent", attemptId });
  forgetKeptGift("later-blocked-giver", "gift");
});

it("preserves unread reports when writes work, then merges memory changes once reads recover", () => {
  const storage = localStorage;
  const userId = "read-blocked-writeable-giver";
  const key = `draw.gifts.kept.${userId}`;
  const attemptId = `0x${"78".repeat(32)}`;
  const sent = { message: "sent", attemptId };
  const cancelled = { message: "cancelled", attemptId };
  const original = JSON.stringify({ sent, cancelled, settled: sent });
  storage.setItem(key, original);
  let blocked = true;
  const failure = new Error("Only reads are blocked");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const setItem = vi.fn(storage.setItem.bind(storage));
  const removeItem = vi.fn(storage.removeItem.bind(storage));
  vi.stubGlobal("localStorage", {
    getItem: (name: string) => {
      if (blocked) throw failure;
      return storage.getItem(name);
    },
    setItem,
    removeItem,
  });

  const saved = keepGift(userId, "new", { message: "cancelled", attemptId });
  forgetKeptGift(userId, "settled");
  expect(storage.getItem(key)).toBe(original);
  expect(saved).toBe(false);
  expect(setItem).not.toHaveBeenCalled();
  expect(removeItem).not.toHaveBeenCalled();
  expect(keptGift(userId, "new")).toEqual(cancelled);
  expect(log.mock.calls).toEqual(
    Array.from({ length: 3 }, () => ["Giving's kept gifts can't be read on this device", failure]),
  );

  blocked = false;
  expect(Object.fromEntries(keptReports(userId))).toEqual({ sent, cancelled, new: cancelled });
  expect(keepGift(userId, "new", { message: "cancelled", attemptId })).toBe(true);
  expect(storage.getItem(key)).toBe(JSON.stringify({ sent, cancelled, new: cancelled }));
});
