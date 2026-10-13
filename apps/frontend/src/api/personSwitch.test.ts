// @vitest-environment happy-dom
import type { SessionEnvelope } from "@drawing-app/api/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardPlacementSaves } from "../sticker-board/boardPlacementSaves";
import { emptyApi, TEST_ME, TEST_OWNER } from "./testing";
import { ApiError } from "./apiClient";
import { boardSticker } from "./testFixtures";
import { requestPersonSwitch, receivePersonSwitchNotice } from "./personSwitch";

const operator = "d5984df6-db28-44f2-801c-2f2f5b565463";
const hana = "bef03287-50ee-4e51-aaef-a9dc1303b854";
const envelope = (userId = operator, version = "first"): SessionEnvelope => ({
  me: { ...TEST_ME, id: userId, lineUserId: userId === operator ? "U-bigwheel" : "dev-video-hana" },
  authenticated: { ...TEST_ME, id: operator, lineUserId: "U-bigwheel" },
  allowedSelections: [
    { ...TEST_OWNER, id: operator, lineDisplayName: "BIGWHEEL" },
    { ...TEST_OWNER, id: hana, lineDisplayName: "Hana" },
  ],
  selectionVersion: version,
  expectedPrivySubject: userId,
  expectedSuiAddress: null,
  personSwitchMode: "verify",
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
function setup() {
  const api = {
    selectPerson: vi.fn().mockResolvedValue(envelope(hana, "second")),
    me: vi.fn().mockResolvedValue(envelope()),
  };
  const suspend = vi.fn();
  const restore = vi.fn();
  const navigate = vi.fn();
  const notice = vi.fn();
  const options = {
    session: envelope(),
    api,
    principal: () => "U-bigwheel",
    settle: async (_signal: AbortSignal) => {},
    blockers: () => [] as string[],
    suspend,
    restore,
    navigate,
    notice,
  };
  return { ...options, options };
}
afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.useRealTimers();
});

describe("requestPersonSwitch", () => {
  it("waits for active placement saves even with an empty failure map", async () => {
    const test = setup();
    const save =
      deferred<Awaited<ReturnType<ReturnType<typeof emptyApi>["saveStickerPlacement"]>>>();
    const saves = new BoardPlacementSaves(
      emptyApi({ saveStickerPlacement: () => save.promise }),
      operator,
    );
    saves.activate();
    saves.save(
      { id: "sticker-a", no: 42 },
      { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
    );
    const switching = requestPersonSwitch(hana, {
      ...test.options,
      settle: (signal) => saves.waitUntilSaved(signal),
    });
    await Promise.resolve();
    expect(test.suspend).toHaveBeenCalledOnce();
    expect(test.api.selectPerson).not.toHaveBeenCalled();
    save.resolve(boardSticker({ stickerId: "sticker-a", placement: null, largePlacement: null }));
    await switching;
    expect(test.api.selectPerson).toHaveBeenCalledExactlyOnceWith(hana, {
      userId: operator,
      selectionVersion: "first",
    });
    expect(test.navigate).toHaveBeenCalledWith("/");
  });

  it("recovers the authoritative profile after a lost response", async () => {
    const test = setup();
    test.api.selectPerson.mockRejectedValue(new ApiError(0, { error: "network" }));
    test.api.me.mockResolvedValue(envelope(hana, "second"));
    localStorage.setItem(`draft:${operator}`, "original draft");
    localStorage.setItem(`outbox:${operator}`, "original outbox");
    await requestPersonSwitch(hana, test.options);
    expect(test.api.me).toHaveBeenCalledExactlyOnceWith("U-bigwheel");
    expect(test.navigate).toHaveBeenCalledWith("/");
    expect(localStorage.getItem(`draft:${operator}`)).toBe("original draft");
    expect(localStorage.getItem(`outbox:${operator}`)).toBe("original outbox");
    expect(test.restore).not.toHaveBeenCalled();
  });

  it.each(["person_switch_placement_unsaved", "person_switch_settings_unsaved"])(
    "retains the current account after %s and reports affected items",
    async (code) => {
      const test = setup();
      const failure = new ApiError(409, { error: code, detail: "sticker 42 (phone)" });
      await expect(
        requestPersonSwitch(hana, {
          ...test.options,
          settle: async () => {
            throw failure;
          },
        }),
      ).rejects.toBe(failure);
      expect(test.api.selectPerson).not.toHaveBeenCalled();
      expect(test.restore).toHaveBeenCalledWith(envelope());
      expect(test.navigate).not.toHaveBeenCalled();
    },
  );

  it("stops selection when settlement exceeds the ordinary request deadline", async () => {
    vi.useFakeTimers();
    const test = setup();
    const switching = requestPersonSwitch(hana, {
      ...test.options,
      settle: () => new Promise(() => {}),
    });
    const expected = expect(switching).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(15_000);
    await expected;
    expect(test.api.selectPerson).not.toHaveBeenCalled();
    expect(test.restore).toHaveBeenCalledWith(envelope());
  });

  it("blocks switching during an ownership operation before suspending or selecting", async () => {
    const test = setup();
    await expect(
      requestPersonSwitch(hana, { ...test.options, blockers: () => ["sticker 42"] }),
    ).rejects.toMatchObject({ code: "person_switch_ownership_pending", detail: "sticker 42" });
    expect(test.suspend).not.toHaveBeenCalled();
    expect(test.api.selectPerson).not.toHaveBeenCalled();
  });

  it("requires server capability and the unchanged LINE principal", async () => {
    const test = setup();
    await expect(
      requestPersonSwitch(hana, {
        ...test.options,
        session: { ...envelope(), personSwitchMode: "off" },
      }),
    ).rejects.toMatchObject({ code: "person_switch_forbidden" });
    await expect(
      requestPersonSwitch(hana, {
        ...test.options,
        principal: () => "another-LINE-user",
      }),
    ).rejects.toMatchObject({ code: "session_account_changed" });
    expect(test.api.selectPerson).not.toHaveBeenCalled();
  });

  it("does not restore an old selection over another tab's authoritative selection", async () => {
    const test = setup();
    test.api.me.mockResolvedValue(envelope(hana, "third"));
    await expect(
      requestPersonSwitch(hana, {
        ...test.options,
        settle: async () => {
          throw new Error("offline");
        },
      }),
    ).rejects.toMatchObject({ code: "network" });
    expect(test.restore).not.toHaveBeenCalled();
    expect(test.navigate).toHaveBeenCalledWith("/");
  });

  it("keeps the primary preservation failure when authoritative recovery also fails", async () => {
    const test = setup();
    const preservation = new ApiError(0, {
      error: "person_switch_placement_preservation_failed",
      detail: "sticker 42 (phone)",
    });
    test.api.me.mockRejectedValue(new ApiError(0, { error: "network" }));
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        requestPersonSwitch(hana, {
          ...test.options,
          settle: async () => {
            throw preservation;
          },
        }),
      ).rejects.toBe(preservation);
      expect(test.api.selectPerson).not.toHaveBeenCalled();
      expect(test.navigate).not.toHaveBeenCalled();
      expect(diagnostic).toHaveBeenCalled();
    } finally {
      diagnostic.mockRestore();
    }
  });

  it("stops the old tab on other-tab notification without accepting a new session", () => {
    const suspend = vi.fn();
    const stop = vi.fn();
    receivePersonSwitchNotice(
      {
        authenticatedUserId: operator,
        userId: hana,
        selectionVersion: "second",
        phase: "selected",
      },
      envelope(),
      suspend,
      stop,
    );
    expect(suspend).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledWith(
      expect.objectContaining({ code: "session_account_changed" }),
      operator,
    );
    receivePersonSwitchNotice(
      { authenticatedUserId: "other", userId: hana, selectionVersion: "second", phase: "selected" },
      envelope(),
      suspend,
      stop,
    );
    expect(suspend).toHaveBeenCalledOnce();
  });
});
