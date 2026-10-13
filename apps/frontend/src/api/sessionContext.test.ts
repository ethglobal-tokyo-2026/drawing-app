import { afterEach, expect, it, vi } from "vitest";
import {
  captureAccountSelection,
  acceptSession,
  assertAccountSelectionCurrent,
  currentSelection,
  isAccountSelectionCurrent,
  onSessionSuspended,
  selectionOf,
  suspendSession,
} from "./sessionContext";
import { sessionEnvelope } from "./sessionTestFixtures";
import type { Me } from "@drawing-app/api/client";
const me: Me = {
  id: "hana",
  lineUserId: "dev-video-hana",
  lineDisplayName: "Hana",
  linePictureUrl: null,
  handle: "hana",
  nsfwOptIn: false,
  language: "en",
  createdAt: "2026-01-01",
  needsHandle: false,
  newStickerCount: 0,
  unseenGratitudeCount: 0,
  kyotoSeikaPractice: false,
};
afterEach(suspendSession);
it("invalidates an earlier version of the same account", () => {
  const first = sessionEnvelope(me, { selectionVersion: "first" });
  acceptSession(first);
  const selected = selectionOf(first);
  expect(isAccountSelectionCurrent(selected)).toBe(true);
  acceptSession({ ...first, selectionVersion: "second" });
  expect(() => assertAccountSelectionCurrent(selected)).toThrow("session_account_changed");
});
it("suspends immediately and informs wallet consumers before a transition", () => {
  acceptSession(sessionEnvelope(me));
  const cleared = vi.fn(() => expect(currentSelection()).toBeNull());
  const stop = onSessionSuspended(cleared);
  suspendSession();
  expect(cleared).toHaveBeenCalledOnce();
  stop();
});
it("keeps accepted selection immutable across profile updates", () => {
  const envelope = sessionEnvelope(me);
  acceptSession(envelope);
  const accepted = currentSelection();
  acceptSession({ ...envelope, me: { ...me, handle: "changed" } });
  expect(currentSelection()).toBe(accepted);
  expect(Object.isFrozen(accepted)).toBe(true);
});

it("does not revive a retained operation when the same server version is restored", () => {
  const envelope = sessionEnvelope(me);
  acceptSession(envelope);
  const check = captureAccountSelection(selectionOf(envelope));
  suspendSession();
  acceptSession(envelope);
  expect(() => check()).toThrow("session_account_changed");
});
