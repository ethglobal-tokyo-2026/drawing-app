// @vitest-environment happy-dom
import { act, useLayoutEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithApi, emptyApi, TEST_ME, TEST_OWNER } from "./testing";
import {
  SessionEnvelopeContext,
  acceptSession,
  currentSelection,
  suspendSession,
} from "./sessionContext";
import { serverSession } from "./serverClients";
import {
  PersonSwitchProvider,
  usePersonSwitch,
  usePersonSwitchBlocker,
} from "./PersonSwitchProvider";
import { useBoardPlacementSaves } from "../sticker-board/BoardPlacementSavesProvider";
import { boardSticker } from "./testFixtures";
import { renderInHost } from "../ui/testing";
import { SessionGate } from "./SessionGate";
import { ApiProvider } from "./ApiProvider";
import { BoardPlacementSavesProvider } from "../sticker-board/BoardPlacementSavesProvider";
import { onSessionLost } from "./sessionLoss";
import type { SessionEnvelope, StickerPlacement } from "@drawing-app/api/client";
import { createHttpApi, createServerClient, type SessionApi } from "./httpApi";
import { ApiError, type ApiClient } from "./apiClient";
import * as lineFunctions from "../line/liff";
import { logOut } from "./logOut";
import { retryPrivySignIn, setPrivyStatus } from "../identity/privy";
import * as reconnectFunctions from "../line/reconnectLine";
import { reloadOntoNewBuild } from "../ui/reloadOntoNewBuild";

vi.mock("../line/liff", async (original) => ({
  ...(await original<typeof import("../line/liff")>()),
  lineUserId: () => "U-you",
}));
const session: SessionEnvelope = {
  me: TEST_ME,
  authenticated: TEST_ME,
  allowedSelections: [TEST_OWNER, { ...TEST_OWNER, id: "hana", lineDisplayName: "Hana" }],
  selectionVersion: "first",
  expectedPrivySubject: "me",
  expectedSuiAddress: null,
  personSwitchMode: "verify",
};
let unmount = () => {};
afterEach(() => {
  unmount();
  suspendSession();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

it("pauses new interaction and signing before an active placement save drains", async () => {
  let saveFinished!: (placement: StickerPlacement) => void;
  const api = emptyApi({
    saveStickerPlacement: () =>
      new Promise((resolve) => {
        saveFinished = resolve;
      }),
  });
  const select = vi
    .spyOn(serverSession, "selectPerson")
    .mockResolvedValue({ ...session, me: { ...TEST_ME, id: "hana" }, selectionVersion: "second" });
  const navigate = vi.spyOn(location, "assign").mockImplementation(() => {});
  acceptSession(session);
  let saves!: ReturnType<typeof useBoardPlacementSaves>["saves"];
  function Control() {
    const current = useBoardPlacementSaves().saves;
    useLayoutEffect(() => {
      saves = current;
    }, [current]);
    const { pending, request } = usePersonSwitch();
    return (
      <button disabled={pending} onClick={() => void request("hana")}>
        Switch
      </button>
    );
  }
  const view = renderWithApi(
    <SessionEnvelopeContext value={session}>
      <PersonSwitchProvider>
        <Control />
      </PersonSwitchProvider>
    </SessionEnvelopeContext>,
    api,
  );
  unmount = view.unmount;
  await act(async () => {});
  act(() =>
    saves.save(
      { id: "sticker-a", no: 42 },
      { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
    ),
  );
  await act(async () => view.host.querySelector("button")?.click());
  expect(currentSelection()).toBeNull();
  expect(view.host.querySelector("button")?.disabled).toBe(true);
  expect(view.host.querySelector("[inert]")).not.toBeNull();
  expect(select).not.toHaveBeenCalled();
  await act(async () =>
    saveFinished(boardSticker({ stickerId: "sticker-a", placement: null, largePlacement: null })),
  );
  expect(select).toHaveBeenCalledOnce();
  expect(navigate).toHaveBeenCalledWith("/");
});

it("keeps a persistent affected-item explanation when ownership blocks the request", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const select = vi.spyOn(serverSession, "selectPerson");
  acceptSession(session);
  function Control() {
    usePersonSwitchBlocker(true, "sticker 42");
    const { request } = usePersonSwitch();
    return <button onClick={() => void request("hana")}>Switch</button>;
  }
  const view = renderWithApi(
    <SessionEnvelopeContext value={session}>
      <PersonSwitchProvider>
        <Control />
      </PersonSwitchProvider>
    </SessionEnvelopeContext>,
  );
  unmount = view.unmount;
  await act(async () => view.host.querySelector("button")?.click());
  expect(select).not.toHaveBeenCalled();
  expect(currentSelection()?.userId).toBe("me");
  expect(view.host.querySelector('[role="alert"]')?.textContent).toContain("ownership");
  expect(view.host.textContent).toContain("sticker 42");
});

it("restores the validated current person after failed settlement while retaining unsaved positions", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(serverSession, "me").mockResolvedValue(session);
  const select = vi.spyOn(serverSession, "selectPerson");
  const api = emptyApi({
    saveStickerPlacement: async () => {
      throw new Error("offline");
    },
  });
  let saves!: ReturnType<typeof useBoardPlacementSaves>["saves"];
  function Control() {
    const current = useBoardPlacementSaves().saves;
    useLayoutEffect(() => {
      saves = current;
    }, [current]);
    const { request } = usePersonSwitch();
    return <button onClick={() => void request("hana")}>Switch</button>;
  }
  const gateApi = { ...serverSession, signIn: async () => session };
  const view = renderInHost(
    <SessionGate
      session={gateApi}
      accessToken={() => "test-token"}
      claims={() => ({ sub: "U-you" })}
      currentLineUserId={() => "U-you"}
      early={null}
    >
      <ApiProvider client={api}>
        <BoardPlacementSavesProvider>
          <PersonSwitchProvider>
            <Control />
          </PersonSwitchProvider>
        </BoardPlacementSavesProvider>
      </ApiProvider>
    </SessionGate>,
  );
  unmount = view.unmount;
  await act(async () => {});
  const original = saves;
  await act(async () =>
    saves.save(
      { id: "sticker-a", no: 42 },
      { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
    ),
  );
  await act(async () => view.host.querySelector("button")?.click());
  expect(select).not.toHaveBeenCalled();
  expect(currentSelection()).toEqual({ userId: "me", selectionVersion: "first" });
  expect(saves).toBe(original);
  expect(saves.read().unsaved.has("sticker-a")).toBe(true);
  expect(view.host.textContent).toContain("sticker 42 (phone)");
  expect(view.host.querySelector("[inert]")).toBeNull();
});

it("keeps a foreign tab's unsaved positions mounted when preservation fails and offers safe retry", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const originalStorage = sessionStorage;
  let blocked = true;
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => originalStorage.getItem(key),
    setItem: (key: string, value: string) => {
      if (blocked) throw new Error("full");
      originalStorage.setItem(key, value);
    },
    removeItem: (key: string) => originalStorage.removeItem(key),
  });
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});
  const lost = vi.fn();
  const stop = onSessionLost(lost);
  acceptSession(session);
  let saves!: ReturnType<typeof useBoardPlacementSaves>["saves"];
  function Control() {
    const current = useBoardPlacementSaves().saves;
    useLayoutEffect(() => {
      saves = current;
    }, [current]);
    return <p>Original board</p>;
  }
  const view = renderWithApi(
    <SessionEnvelopeContext value={session}>
      <PersonSwitchProvider>
        <Control />
      </PersonSwitchProvider>
    </SessionEnvelopeContext>,
    emptyApi({ saveStickerPlacement: () => new Promise(() => {}) }),
  );
  unmount = () => {
    view.unmount();
    stop();
  };
  await act(async () => {});
  act(() =>
    saves.save(
      { id: "sticker-a", no: 42 },
      { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
    ),
  );
  act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "croquis.person-switch.notice",
        newValue: JSON.stringify({
          authenticatedUserId: session.authenticated.id,
          userId: "hana",
          selectionVersion: "second",
          phase: "selected",
        }),
      }),
    );
  });
  expect(currentSelection()).toBeNull();
  expect(lost).not.toHaveBeenCalled();
  expect(view.host.textContent).toContain("Original board");
  expect(view.host.textContent).toContain("sticker 42 (phone)");
  expect(view.host.textContent).not.toContain("Reload");
  blocked = false;
  await act(async () =>
    view.host.querySelector<HTMLButtonElement>(".error-line__text button")?.click(),
  );
  expect(reload).not.toHaveBeenCalled();
  expect(lost).toHaveBeenCalledWith(
    expect.objectContaining({ code: "session_account_changed" }),
    "me",
  );
  expect(sessionStorage.getItem("croquis.board-placement-saves.me")).toContain("sticker-a");
});

function brokenJournalGate(api: ApiClient, refresh?: SessionApi["signIn"]) {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const originalStorage = sessionStorage;
  let blocked = true;
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => originalStorage.getItem(key),
    setItem: (key: string, value: string) => {
      if (blocked) throw new Error("full");
      originalStorage.setItem(key, value);
    },
    removeItem: (key: string) => originalStorage.removeItem(key),
  });
  let saves!: ReturnType<typeof useBoardPlacementSaves>["saves"];
  function Control() {
    const current = useBoardPlacementSaves().saves;
    useLayoutEffect(() => {
      saves = current;
    }, [current]);
    const { request } = usePersonSwitch();
    return (
      <>
        <p>Original board</p>
        <button onClick={() => void request("hana")}>Switch</button>
      </>
    );
  }
  const gateApi = {
    ...serverSession,
    me: async () => session,
    signIn: refresh ?? (async () => session),
  };
  const view = renderInHost(
    <SessionGate
      session={gateApi}
      accessToken={() => "test-token"}
      claims={() => (refresh ? { sub: "U-you", name: "New LINE name" } : { sub: "U-you" })}
      currentLineUserId={() => "U-you"}
      early={null}
    >
      <ApiProvider client={api}>
        <BoardPlacementSavesProvider>
          <PersonSwitchProvider>
            <Control />
          </PersonSwitchProvider>
        </BoardPlacementSavesProvider>
      </ApiProvider>
    </SessionGate>,
  );
  unmount = view.unmount;
  return {
    view,
    saves: () => saves,
    allowStorage: () => {
      blocked = false;
    },
  };
}
const changedEnvelope = { ...session, me: { ...TEST_ME, id: "hana" }, selectionVersion: "second" };

it("keeps the actual Gate owner mounted after a late HTTP409 while its journal cannot be written", async () => {
  let respond!: (response: Response) => void;
  const http = createHttpApi(
    createServerClient(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        }),
      { userId: "me", selectionVersion: "first" },
    ),
  );
  const test = brokenJournalGate(http);
  await act(async () => {});
  const original = test.saves();
  await act(async () =>
    original.save(
      { id: "sticker-a", no: 42 },
      { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
    ),
  );
  await act(async () =>
    respond(
      new Response(JSON.stringify({ error: "session_account_changed" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  expect(test.view.host.textContent).toContain("Original board");
  expect(test.saves()).toBe(original);
  expect(test.view.host.textContent).toContain("sticker 42 (phone)");
  expect(test.view.host.textContent).not.toContain("Reload");
  expect(currentSelection()).toBeNull();
  test.allowStorage();
  await act(async () =>
    test.view.host.querySelector<HTMLButtonElement>(".error-line__text button")?.click(),
  );
  expect(test.view.host.textContent).not.toContain("Original board");
  expect(test.view.host.textContent).toContain("Reload");
  expect(sessionStorage.getItem("croquis.board-placement-saves.me")).toContain("sticker-a");
});

it("blocks changed-selection recovery navigation until the original Gate owner positions are preserved", async () => {
  vi.spyOn(serverSession, "me").mockResolvedValue(changedEnvelope);
  const navigate = vi.spyOn(location, "assign").mockImplementation(() => {});
  const test = brokenJournalGate(emptyApi({ saveStickerPlacement: () => new Promise(() => {}) }));
  await act(async () => {});
  act(() =>
    test
      .saves()
      .save(
        { id: "sticker-a", no: 42 },
        { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
      ),
  );
  await act(async () => test.view.host.querySelector("button")?.click());
  expect(navigate).not.toHaveBeenCalled();
  expect(test.view.host.textContent).toContain("Original board");
  expect(test.view.host.textContent).toContain("sticker 42 (phone)");
  expect(test.view.host.textContent).not.toContain("Reload");
  test.allowStorage();
  await act(async () =>
    test.view.host.querySelector<HTMLButtonElement>(".error-line__text button")?.click(),
  );
  expect(navigate).toHaveBeenCalledWith("/");
});

it("retains primary preservation details after failed /me recovery with the actual Gate still mounted", async () => {
  vi.spyOn(serverSession, "me").mockRejectedValue(new Error("session check offline"));
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});
  const test = brokenJournalGate(emptyApi({ saveStickerPlacement: () => new Promise(() => {}) }));
  await act(async () => {});
  act(() =>
    test
      .saves()
      .save(
        { id: "sticker-a", no: 42 },
        { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
      ),
  );
  await act(async () => test.view.host.querySelector("button")?.click());
  expect(test.view.host.textContent).toContain("Original board");
  expect(test.view.host.textContent).toContain("sticker 42 (phone)");
  expect(test.view.host.textContent).not.toContain("Reload");
  expect(reload).not.toHaveBeenCalled();
  test.allowStorage();
  await act(async () =>
    test.view.host.querySelector<HTMLButtonElement>(".error-line__text button")?.click(),
  );
  expect(reload).toHaveBeenCalledOnce();
  expect(sessionStorage.getItem("croquis.board-placement-saves.me")).toContain("sticker-a");
});

it("defers ordinary LINE logout until the original owner positions are preserved", async () => {
  const ending = vi.spyOn(lineFunctions, "lineLogout").mockResolvedValue(undefined);
  const test = brokenJournalGate(emptyApi({ saveStickerPlacement: () => new Promise(() => {}) }));
  await act(async () => {});
  act(() =>
    test
      .saves()
      .save(
        { id: "sticker-a", no: 42 },
        { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
      ),
  );
  await act(async () => logOut({ userId: "me", selectionVersion: "first" }));
  expect(ending).not.toHaveBeenCalled();
  expect(test.view.host.textContent).toContain("Original board");
  expect(test.view.host.textContent).not.toContain("Reload");
  test.allowStorage();
  await act(async () =>
    test.view.host.querySelector<HTMLButtonElement>(".error-line__text button")?.click(),
  );
  expect(ending).toHaveBeenCalledOnce();
  expect(sessionStorage.getItem("croquis.board-placement-saves.me")).toContain("sticker-a");
});

it("defers automatic new-build reload until the original owner positions are preserved", async () => {
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});
  const test = brokenJournalGate(emptyApi({ saveStickerPlacement: () => new Promise(() => {}) }));
  await act(async () => {});
  act(() =>
    test
      .saves()
      .save(
        { id: "sticker-a", no: 42 },
        { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
      ),
  );
  const failedImport = new Event("vite:preloadError", { cancelable: true });
  act(() => reloadOntoNewBuild(failedImport, "/assets/new-build.js"));
  expect(reload).not.toHaveBeenCalled();
  expect(failedImport.defaultPrevented).toBe(true);
  expect(test.view.host.textContent).toContain("sticker 42 (phone)");
  test.allowStorage();
  await act(async () =>
    test.view.host.querySelector<HTMLButtonElement>(".error-line__text button")?.click(),
  );
  expect(reload).toHaveBeenCalledOnce();
  expect(sessionStorage.getItem("croquis.board-placement-saves.me")).toContain("sticker-a");
});

it("defers background profile failure teardown until the original owner positions are preserved", async () => {
  let rejectProfile!: (error: unknown) => void;
  const profile = new Promise<SessionEnvelope>((_resolve, reject) => {
    rejectProfile = reject;
  });
  const test = brokenJournalGate(
    emptyApi({ saveStickerPlacement: () => new Promise(() => {}) }),
    () => profile,
  );
  await act(async () => {});
  act(() =>
    test
      .saves()
      .save(
        { id: "sticker-a", no: 42 },
        { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
      ),
  );
  await act(async () => rejectProfile(new ApiError(409, { error: "session_account_changed" })));
  expect(test.view.host.textContent).toContain("Original board");
  expect(test.view.host.textContent).toContain("sticker 42 (phone)");
  expect(test.view.host.textContent).not.toContain("Reload");
  test.allowStorage();
  await act(async () =>
    test.view.host.querySelector<HTMLButtonElement>(".error-line__text button")?.click(),
  );
  expect(test.view.host.textContent).not.toContain("Original board");
  expect(test.view.host.textContent).toContain("Reload");
});

it.each(["reload", "reconnect"])(
  "preserves mounted original positions before Privy %s recovery",
  async (recovery) => {
    const reload = vi.spyOn(location, "reload").mockImplementation(() => {});
    const reconnect = vi.spyOn(reconnectFunctions, "reconnectLine");
    const logout = vi.spyOn(lineFunctions, "lineLogout");
    const navigate = vi.spyOn(location, "assign").mockImplementation(() => {});
    const test = brokenJournalGate(emptyApi({ saveStickerPlacement: () => new Promise(() => {}) }));
    await act(async () => {});
    const positions = { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } };
    act(() => test.saves().save({ id: "sticker-a", no: 42 }, positions));
    setPrivyStatus({
      state: "failed",
      reason: "Recovery needed",
      reloadRequired: recovery === "reload",
      reconnectLine: recovery === "reconnect",
    });
    const failed = vi.fn();
    act(() => retryPrivySignIn("/gift-return", failed));
    expect(reload).not.toHaveBeenCalled();
    expect(reconnect).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(test.view.host.textContent).toContain("Original board");
    expect(test.view.host.textContent).toContain("sticker 42 (phone)");
    expect(test.saves().pendingSpots().get("sticker-a")?.phone).toEqual(positions.phone);
    test.allowStorage();
    await act(async () =>
      test.view.host.querySelector<HTMLButtonElement>(".error-line__text button")?.click(),
    );
    expect(sessionStorage.getItem("croquis.board-placement-saves.me")).toContain("sticker-a");
    if (recovery === "reload") expect(reload).toHaveBeenCalledOnce();
    else {
      expect(reconnect).toHaveBeenCalledExactlyOnceWith("/gift-return");
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/gift-return");
      expect(failed).not.toHaveBeenCalled();
    }
  },
);

it("shows a persisted Giving blocker without a mounted Giving screen", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const client = createServerClient(
    async () =>
      Response.json(
        {
          error: "person_switch_busy",
          pendingOwnership: {
            kind: "delivery",
            giftId: "gift-diagnostic",
            stickerId: "sticker-a",
            stickerNo: 42,
            providerMessage: "untrusted provider text",
          },
        },
        { status: 409 },
      ),
    { userId: "me", selectionVersion: "first" },
  );
  const sessionApi = (await import("./httpApi")).createSessionApi(client);
  vi.spyOn(serverSession, "selectPerson").mockImplementation(sessionApi.selectPerson);
  vi.spyOn(serverSession, "me").mockResolvedValue(session);
  const stopRestore = (await import("./sessionContext")).onSessionRestoreRequested(acceptSession);
  acceptSession(session);
  function Control() {
    const { request } = usePersonSwitch();
    return <button onClick={() => void request("hana")}>Switch</button>;
  }
  const view = renderWithApi(
    <SessionEnvelopeContext value={session}>
      <PersonSwitchProvider>
        <Control />
      </PersonSwitchProvider>
    </SessionEnvelopeContext>,
    emptyApi(),
  );
  unmount = view.unmount;
  await act(async () => view.host.querySelector("button")?.click());
  expect(view.host.textContent).toContain("giving sticker 42");
  expect(view.host.textContent).not.toContain("untrusted provider text");
  expect(view.host.textContent).not.toContain("gift-diagnostic");
  expect(view.host.querySelector('[role="alert"]')).not.toBeNull();
  stopRestore();
});
