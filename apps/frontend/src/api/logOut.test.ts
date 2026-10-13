// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { BoardPlacementSaves } from "../sticker-board/boardPlacementSaves";
import { emptyApi, TEST_ME } from "./testing";
import { sessionEnvelope } from "./sessionTestFixtures";
import { acceptSession, suspendSession } from "./sessionContext";
import { beforeAccountRelease, retryAccountRelease } from "./sessionLoss";
import { serverSession } from "./serverClients";
import { logOut } from "./logOut";

vi.mock("../line/liff", () => ({ lineLogout: async (end: () => Promise<void>) => end() }));
vi.mock("./serverClients", () => ({
  serverSession: { signOut: vi.fn().mockResolvedValue(undefined) },
}));
let leave = () => {};
afterEach(() => {
  leave();
  suspendSession();
  vi.restoreAllMocks();
});

it("ends the originally requested server session after safe retry despite its preservation suspension", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const selection = { userId: TEST_ME.id, selectionVersion: "first" };
  acceptSession(sessionEnvelope(TEST_ME, { selectionVersion: "first" }));
  let blocked = true;
  const saved = new Map<string, string>();
  const saves = new BoardPlacementSaves(emptyApi(), TEST_ME.id, {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => {
      if (blocked) throw new Error("full");
      saved.set(key, value);
    },
    removeItem: (key) => {
      saved.delete(key);
    },
  });
  saves.save(
    { id: "sticker-a", no: 42 },
    { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
  );
  leave = beforeAccountRelease({
    userId: TEST_ME.id,
    preservationError: () => saves.read().preservationError,
    retryPreservation: () => saves.retryPreservation(),
    blocked: suspendSession,
  });
  await logOut(selection);
  expect(serverSession.signOut).not.toHaveBeenCalled();
  blocked = false;
  retryAccountRelease(TEST_ME.id, () => {});
  await Promise.resolve();
  expect(serverSession.signOut).toHaveBeenCalledExactlyOnceWith({
    userId: "me",
    selectionVersion: "first",
  });
  expect(saved.get("croquis.board-placement-saves.me")).toContain("sticker-a");
});
