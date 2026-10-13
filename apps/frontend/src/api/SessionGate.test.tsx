// @vitest-environment happy-dom
import { requestSessionRestore, suspendSession } from "./sessionContext";
import { sessionEnvelope, accountSelection } from "./sessionTestFixtures";
import { act, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { errorMessage } from "../i18n/errorMessage";
import { currentLanguage, i18next } from "../i18n/i18n";
import { keepChosenLanguage, readChosenLanguage } from "../i18n/language";
import { startInLineLanguage } from "../i18n/pageLanguage";
import { STILL_OPENING_MS } from "../line/GateParts";
import type { LineClaims } from "../line/liff";
import { ApiError } from "./apiClient";
import type { Me, SessionEnvelope } from "@drawing-app/api/client";
import { openEarly, type EarlySession } from "./earlySession";
import type { SessionApi } from "./httpApi";
import { useMe, useSetMe } from "./meContext";
import { SessionGate } from "./SessionGate";
import { reportSessionLost } from "./sessionLoss";
import { inLanguage } from "../ui/testing";
import { emptyApi } from "./testing";

const me: Me = {
  id: "u1",
  handle: "alice",
  lineDisplayName: "Alice",
  linePictureUrl: null,
  nsfwOptIn: false,
  lineUserId: "line-alice",
  language: "en",
  createdAt: "2026-09-26T00:00:00.000Z",
  needsHandle: false,
  newStickerCount: 0,
  unseenGratitudeCount: 0,
  kyotoSeikaPractice: false,
};

/** The app behind the gate; its `lang` is the app's language as it first opens. */
function Board() {
  const [language] = useState(currentLanguage);
  return <p lang={language}>Board of @{useMe().handle}</p>;
}

/**
 * Turns your NSFW opt-in on in place, as a setting saved on the Settings note does: once `answered`
 * lands, when given, as the server's answer would.
 */
function OptInSwitch({ answered = Promise.resolve() }: { answered?: Promise<void> }) {
  const you = useMe();
  const setMe = useSetMe();
  return (
    <button
      type="button"
      onClick={() => void answered.then(() => setMe({ ...you, nsfwOptIn: true }))}
    >
      {you.nsfwOptIn ? "18+ on" : "18+ off"}
    </button>
  );
}

const settle = () => act(() => Promise.resolve());
let cleanup = () => {};
afterEach(() => cleanup());
const diagnosticOutput = { warn: console.warn.bind(console), error: console.error.bind(console) };
vi.spyOn(console, "error").mockImplementation(() => {});

function expectDiagnostics(expected: { warn: unknown[][]; error?: unknown[][] }) {
  for (const level of ["warn", "error"] as const) {
    const calls = expected[level] ?? [];
    const previous = console[level];
    const captured = vi.fn((...args: unknown[]) => {
      if (!calls.some((call) => call.length === args.length && call.every((v, i) => v === args[i])))
        diagnosticOutput[level](...args);
    });
    console[level] = captured;
    onTestFinished(() => {
      console[level] = previous;
      expect(captured.mock.calls).toEqual(calls);
    });
  }
}

/** Who LINE's ID token names: Alice, as the server last heard of her. */
const ALICE_CLAIMS: LineClaims = { sub: "line-alice", name: "Alice" };

function render(
  session: SessionApi,
  accessToken: () => string | null = () => "token",
  reconnect = vi.fn<() => Promise<void>>().mockResolvedValue(),
  {
    early = null,
    claims = ALICE_CLAIMS,
    app = <Board />,
  }: { early?: EarlySession | null; claims?: LineClaims; app?: ReactNode } = {},
) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <SessionGate
        session={session}
        accessToken={accessToken}
        claims={() => claims}
        currentLineUserId={() => claims.sub}
        early={early}
        reconnect={reconnect}
      >
        {app}
      </SessionGate>,
    ),
  );
  cleanup = () => {
    act(() => root.unmount());
    host.remove();
  };
  return host;
}

const session = (overrides: Partial<SessionApi>): SessionApi => ({
  signIn: () => Promise.resolve(sessionEnvelope(me)),
  me: () => Promise.reject(new ApiError(401, { error: "signed_out" })),
  setHandle: () => Promise.reject(new Error("not expected")),
  signOut: () => Promise.resolve(),
  selectPerson: () => Promise.reject(new Error("not expected")),
  privyJwt: () => Promise.reject(new Error("not expected")),
  ...overrides,
});

/** The session the cookie held as the app started: `you`, or none. */
const earlyAs = (you: Me | null) => ({
  me: Promise.resolve(you ? sessionEnvelope(you) : null),
  accept: vi.fn<EarlySession["accept"]>(),
  drop: vi.fn<EarlySession["drop"]>(),
});

/** A sign-in that waits until `finish` is called. */
function pendingSignIn(answer: Me) {
  let finish = () => {};
  const signIn = vi.fn(
    () =>
      new Promise<SessionEnvelope>((resolve) => {
        finish = () => resolve(sessionEnvelope(answer));
      }),
  );
  return { signIn, finish: () => finish() };
}

const type = (input: HTMLInputElement, value: string) =>
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

const submit = (host: HTMLElement) =>
  act(() => {
    host.querySelector("form")?.requestSubmit();
  });

describe("SessionGate", () => {
  it("closes an account mismatch with Reload and never automatically signs in", async () => {
    const accountChanged = new ApiError(409, { error: "session_account_changed" });
    expectDiagnostics({
      warn: [["The account changed; reload to open the current session", accountChanged]],
    });
    const signIn = vi.fn<SessionApi["signIn"]>();
    const host = render(session({ me: () => Promise.resolve(sessionEnvelope(me)), signIn }));
    await settle();
    act(() => reportSessionLost(accountChanged, me.id));
    await settle();
    expect(host.textContent).not.toContain("Board of");
    expect(host.querySelector("button")?.textContent).toBe("Reload");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("ignores Alice's late session errors after mounting Bob", async () => {
    expectDiagnostics({ warn: [] });
    const bob = { ...me, id: "bob", handle: "bob", lineUserId: "line-bob" };
    const host = render(
      session({ me: () => Promise.resolve(sessionEnvelope(bob)) }),
      undefined,
      undefined,
      {
        claims: { sub: "line-bob", name: "Alice" },
      },
    );
    await settle();
    for (const error of [
      new ApiError(401, { error: "signed_out" }),
      new ApiError(409, { error: "session_account_changed" }),
    ]) {
      act(() => reportSessionLost(error, me.id));
      await settle();
    }
    expect(host.textContent).toContain("Board of @bob");
  });

  it("resumes the matching server session without reading or exchanging an old LINE token", async () => {
    const resume = vi.fn<SessionApi["me"]>().mockResolvedValue(sessionEnvelope(me));
    const signIn = vi.fn<SessionApi["signIn"]>();
    const accessToken = vi.fn(() => "expired-token");
    const host = render(session({ me: resume, signIn }), accessToken);
    await settle();
    expect(resume).toHaveBeenCalledWith("line-alice");
    expect(signIn).not.toHaveBeenCalled();
    expect(accessToken).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Board of @alice");
  });

  it.each([
    ["ja", "en"],
    ["en", "ja"],
  ] as const)(
    "signs in with LINE's token and LINE's language (%s), not the one this phone kept (%s), then opens the app as you",
    async (line, kept) => {
      keepChosenLanguage(kept);
      startInLineLanguage(line);
      await inLanguage(kept);
      onTestFinished(() => {
        localStorage.clear();
        startInLineLanguage("en");
      });
      const signIn = vi.fn(() => Promise.resolve(sessionEnvelope(me)));
      const host = render(session({ signIn }));
      expect(host.textContent).not.toContain("Board");
      await settle();
      // A new account starts in it, so a language this phone kept can't stand in for LINE's.
      expect(signIn).toHaveBeenCalledWith({ accessToken: "token", language: line });
      expect(host.textContent).toContain("Board of @alice");
    },
  );

  it.each([
    ["ja", "en"],
    ["en", "ja"],
  ] as const)(
    "opens in the account's language (%s) over this device's (%s), which then keeps it",
    async (account, device) => {
      keepChosenLanguage(device);
      await inLanguage(device);
      onTestFinished(() => localStorage.clear());
      const signIn = () => Promise.resolve(sessionEnvelope({ ...me, language: account }));
      const host = render(session({ signIn }));
      await settle();
      expect(host.querySelector("p")?.lang).toBe(account);
      expect(readChosenLanguage()).toBe(account);
    },
  );

  it.each([
    new ApiError(503, { error: "internal_error" }),
    new ApiError(502, { error: "line_unavailable" }),
  ])("retries $status $code without restarting LINE authentication", async (refusal) => {
    const reconnect = vi.fn<() => Promise<void>>().mockResolvedValue();
    const signIn = vi
      .fn<SessionApi["signIn"]>()
      .mockRejectedValueOnce(refusal)
      .mockResolvedValueOnce(sessionEnvelope(me));
    const host = render(session({ signIn }), () => "token", reconnect);
    await settle();
    expect(host.textContent).toContain("Couldn’t sign you in");
    expect(host.textContent).toContain(errorMessage(refusal));
    expect(host.textContent).toContain(refusal.code);
    act(() => host.querySelector("button")?.click());
    await settle();
    expect(host.textContent).toContain("Board of @alice");
    expect(reconnect).not.toHaveBeenCalled();
  });

  it.each(["line_token_invalid", "line_token_expired", "signed_out"])(
    "reconnects LINE on %s instead of resubmitting the rejected token",
    async (code) => {
      const signIn = vi
        .fn<SessionApi["signIn"]>()
        .mockRejectedValue(new ApiError(401, { error: code }));
      const reconnect = vi.fn<() => Promise<void>>().mockResolvedValue();
      const host = render(session({ signIn }), () => "rejected-token", reconnect);
      await settle();
      expect(host.textContent).toContain(errorMessage(new ApiError(401, { error: code })));
      expect(reconnect).not.toHaveBeenCalled();
      expect(host.querySelector("button")?.textContent).toBe("Reconnect with LINE");
      act(() => host.querySelector("button")?.click());
      await settle();
      expect(reconnect).toHaveBeenCalledOnce();
      expect(signIn).toHaveBeenCalledOnce();
      expect(host.querySelector('[role="status"]')?.textContent).toBe("Reconnecting with LINE…");
    },
  );

  it("does not replace a session or start LINE login when checking the session fails", async () => {
    const resume = vi
      .fn<SessionApi["me"]>()
      .mockRejectedValueOnce(new ApiError(0, { error: "network" }))
      .mockResolvedValueOnce(sessionEnvelope(me));
    const signIn = vi.fn<SessionApi["signIn"]>();
    const reconnect = vi.fn<() => Promise<void>>().mockResolvedValue();
    const host = render(session({ me: resume, signIn }), () => "token", reconnect);
    await settle();
    expect(host.textContent).toContain("Check your connection");
    act(() => host.querySelector("button")?.click());
    await settle();
    expect(host.textContent).toContain("Board of @alice");
    expect(signIn).not.toHaveBeenCalled();
    expect(reconnect).not.toHaveBeenCalled();
  });

  it("shows a failed reconnect without exposing SDK error details or looping", async () => {
    const signIn = vi
      .fn<SessionApi["signIn"]>()
      .mockRejectedValue(new ApiError(401, { error: "line_token_invalid" }));
    const reconnect = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error("private-login-url"));
    const host = render(session({ signIn }), () => "token", reconnect);
    await settle();
    act(() => host.querySelector("button")?.click());
    await settle();
    expect(host.textContent).toContain("Couldn’t reconnect with LINE");
    expect(host.textContent).not.toContain("private-login-url");
    expect(signIn).toHaveBeenCalledOnce();
    expect(reconnect).toHaveBeenCalledOnce();
    expect(host.querySelector("button")?.disabled).toBe(false);
  });

  it("uses the saved language and handle prompt when resuming an unfinished account", async () => {
    onTestFinished(async () => {
      localStorage.clear();
      await i18next.changeLanguage("en");
    });
    const host = render(
      session({
        me: () =>
          Promise.resolve(
            sessionEnvelope({ ...me, handle: null, needsHandle: true, language: "ja" }),
          ),
      }),
    );
    await settle();
    expect(readChosenLanguage()).toBe("ja");
    expect(host.querySelector("form")).not.toBeNull();
    expect(host.textContent).not.toContain("Board of");
  });

  it("says why it can't sign in when LINE can't give a token, and never asks the server", async () => {
    const signIn = vi.fn(() => Promise.resolve(sessionEnvelope(me)));
    const host = render(session({ signIn }), () => {
      throw new Error("LIFF has no access token for this login");
    });
    await settle();
    expect(host.textContent).toContain("Couldn’t sign you in");
    expect(host.textContent).toContain("LIFF has no access token for this login");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("asks for a handle when yours is taken, keeps the app shut until one saves, then opens", async () => {
    const setHandle = vi
      .fn<SessionApi["setHandle"]>()
      .mockRejectedValueOnce(new ApiError(409, { error: "handle_taken" }))
      .mockResolvedValueOnce(sessionEnvelope({ ...me, handle: "alice2" }));
    const host = render(
      session({
        signIn: () => Promise.resolve(sessionEnvelope({ ...me, handle: null, needsHandle: true })),
        setHandle,
      }),
    );
    await settle();
    const input = host.querySelector("input");
    if (!input) throw new Error("no handle field");

    type(input, "@alice");
    submit(host);
    await settle();
    expect(setHandle).toHaveBeenLastCalledWith("alice", accountSelection(me.id));
    expect(host.textContent).toContain("@alice is taken");
    expect(host.textContent).not.toContain("Board");

    type(input, "alice2");
    submit(host);
    await settle();
    expect(host.textContent).toContain("Board of @alice2");
  });

  it("names a LINE name that can't be the handle as it is, without putting an @ in front of it", async () => {
    const host = render(
      session({
        signIn: () =>
          Promise.resolve(
            sessionEnvelope({ ...me, handle: null, needsHandle: true, lineDisplayName: "Ali@ce" }),
          ),
      }),
    );
    await settle();
    const lead = host.querySelector(".line-gate__lead")?.textContent ?? "";
    expect(lead).toContain("Ali@ce");
    expect(lead).not.toContain("@Ali@ce");
  });

  it("keeps the handle key lit while the handle saves, and takes no second try", async () => {
    let finish = (_saved: { me: Me }) => {};
    const setHandle = vi.fn<SessionApi["setHandle"]>(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const host = render(
      session({
        signIn: () => Promise.resolve(sessionEnvelope({ ...me, handle: null, needsHandle: true })),
        setHandle,
      }),
    );
    await settle();
    const input = host.querySelector("input");
    if (!input) throw new Error("no handle field");
    type(input, "alice2");
    submit(host);
    await settle();
    const key = host.querySelector<HTMLButtonElement>("button[type=submit]");
    expect(key?.disabled).toBe(false);
    expect(key?.getAttribute("aria-busy")).toBe("true");
    expect(key?.getAttribute("aria-disabled")).toBe("true");

    submit(host);
    await settle();
    expect(setHandle).toHaveBeenCalledOnce();
    finish(sessionEnvelope({ ...me, handle: "alice2" }));
    await settle();
    expect(host.textContent).toContain("Board of @alice2");
  });
});

describe("SessionGate with the cookie from the last visit", () => {
  it("rechecks the cookie after an early network failure without exchanging a stale LINE token", async () => {
    const resume = vi
      .fn<SessionApi["me"]>()
      .mockRejectedValueOnce(new ApiError(0, { error: "network" }))
      .mockResolvedValueOnce(sessionEnvelope(me));
    const signIn = vi
      .fn<SessionApi["signIn"]>()
      .mockRejectedValue(new ApiError(401, { error: "line_token_expired" }));
    const accessToken = vi.fn(() => "expired-token");
    const reconnect = vi.fn<() => Promise<void>>().mockResolvedValue();
    const client = session({ me: resume, signIn });
    const early = openEarly(client, () => emptyApi(), { board: true });
    const host = render(client, accessToken, reconnect, { early });
    await settle();
    expect(host.textContent).toContain("Check your connection");
    expect(signIn).not.toHaveBeenCalled();

    act(() => host.querySelector("button")?.click());
    await settle();
    expect(resume).toHaveBeenLastCalledWith("line-alice");
    expect(host.textContent).toContain("Board of @alice");
    expect(accessToken).not.toHaveBeenCalled();
    expect(reconnect).not.toHaveBeenCalled();
  });

  it("opens as the cookie's person when LINE's user is theirs, without signing in again", async () => {
    const signIn = vi.fn(() => Promise.resolve(sessionEnvelope(me)));
    const early = earlyAs(me);
    const host = render(session({ signIn }), undefined, undefined, { early });
    await settle();
    expect(host.textContent).toContain("Board of @alice");
    expect(signIn).not.toHaveBeenCalled();
    expect(early.accept).toHaveBeenCalledWith(sessionEnvelope(me));
    expect(early.drop).not.toHaveBeenCalled();
  });

  it("signs in with LINE when the cookie is someone else's, and never shows their board", async () => {
    const mallory: Me = { ...me, id: "u2", handle: "mallory", lineUserId: "U-mallory" };
    const { signIn, finish } = pendingSignIn(me);
    const early = earlyAs(mallory);
    const host = render(session({ signIn }), undefined, undefined, { early });
    await settle();
    // Signing in as Alice is still under way: nothing of Mallory's shows meanwhile.
    expect(signIn).toHaveBeenCalledOnce();
    expect(early.drop).toHaveBeenCalled();
    expect(early.accept).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain("Board");
    finish();
    await settle();
    expect(host.textContent).toContain("Board of @alice");
    expect(host.textContent).not.toContain("mallory");
  });

  it("signs in with LINE when the cookie holds no session", async () => {
    const signIn = vi.fn(() => Promise.resolve(sessionEnvelope(me)));
    const early = earlyAs(null);
    const host = render(session({ signIn }), undefined, undefined, { early });
    await settle();
    expect(signIn).toHaveBeenCalledOnce();
    expect(early.drop).toHaveBeenCalled();
    expect(host.textContent).toContain("Board of @alice");
  });

  it.each([
    ["a new LINE name", { ...ALICE_CLAIMS, name: "Alice B" }],
    ["a new LINE picture", { ...ALICE_CLAIMS, picture: "https://profile.line-scdn.net/a" }],
  ])(
    "opens at once after %s, and signs in with LINE behind it to bring it to the account",
    async (_change, claims) => {
      const { signIn, finish } = pendingSignIn({ ...me, handle: "alice-renamed" });
      const host = render(session({ signIn }), undefined, undefined, {
        early: earlyAs(me),
        claims,
      });
      await settle();
      expect(host.textContent).toContain("Board of @alice");
      expect(signIn).toHaveBeenCalledOnce();
      finish();
      await settle();
      expect(host.textContent).toContain("Board of @alice-renamed");
    },
  );

  it("keeps a newly chosen handle when an earlier profile refresh finishes afterward", async () => {
    const unfinished = { ...me, handle: null, needsHandle: true };
    const { signIn, finish } = pendingSignIn({ ...unfinished, lineDisplayName: "Alice B" });
    const setHandle = vi
      .fn<SessionApi["setHandle"]>()
      .mockResolvedValue(sessionEnvelope({ ...me, handle: "alice2" }));
    const host = render(session({ signIn, setHandle }), undefined, undefined, {
      early: earlyAs(unfinished),
      claims: { ...ALICE_CLAIMS, name: "Alice B" },
    });
    await settle();
    expect(signIn).toHaveBeenCalledOnce();
    const input = host.querySelector("input");
    if (!input) throw new Error("no handle field");
    type(input, "alice2");
    submit(host);
    await settle();
    expect(host.textContent).toContain("Board of @alice2");

    finish();
    await settle();
    expect(host.querySelector("form")).toBeNull();
    expect(host.textContent).toContain("Board of @alice2");
  });

  it("keeps a setting saved in place when an earlier profile refresh finishes afterward", async () => {
    const { signIn, finish } = pendingSignIn({ ...me, lineDisplayName: "Alice B" });
    const host = render(session({ signIn }), undefined, undefined, {
      early: earlyAs(me),
      claims: { ...ALICE_CLAIMS, name: "Alice B" },
      app: <OptInSwitch />,
    });
    await settle();
    expect(signIn).toHaveBeenCalledOnce();
    await act(async () => host.querySelector("button")?.click());
    expect(host.textContent).toBe("18+ on");
    finish();
    await settle();
    expect(host.textContent).toBe("18+ on");
  });
});

describe("SessionGate when a request finds the session gone", () => {
  it("keeps Reload visible after duplicate expiry notifications without checking Me or reconnecting", async () => {
    const gone = new ApiError(401, { error: "signed_out" });
    expectDiagnostics({ warn: [["The session ended; reload to continue", gone]] });
    const resume = vi.fn<SessionApi["me"]>().mockResolvedValue(sessionEnvelope(me));
    const signIn = vi.fn<SessionApi["signIn"]>().mockResolvedValue(sessionEnvelope(me));
    const reconnect = vi.fn<() => Promise<void>>().mockResolvedValue();
    const host = render(session({ me: resume, signIn }), undefined, reconnect);
    await settle();
    expect(host.textContent).toContain("Board of @alice");
    act(() => {
      reportSessionLost(gone, me.id);
      reportSessionLost(gone, me.id);
    });
    await settle();
    act(() => reportSessionLost(gone, me.id));
    await settle();
    expect(host.textContent).not.toContain("Board of");
    expect(host.querySelector("h1")?.textContent).toBe("Your session ended");
    expect(host.textContent).toContain("Reload to continue");
    expect(host.querySelector("button")?.textContent).toBe("Reload");
    expect(resume).toHaveBeenCalledExactlyOnceWith("line-alice");
    expect(signIn).not.toHaveBeenCalled();
    expect(reconnect).not.toHaveBeenCalled();
    const reload = vi.spyOn(location, "reload").mockImplementation(() => {});
    onTestFinished(() => reload.mockRestore());
    act(() => host.querySelector("button")?.click());
    expect(reload).toHaveBeenCalledOnce();
    expect(reconnect).not.toHaveBeenCalled();
  });

  it("keeps the account closed when profile and settings responses arrive after expiry", async () => {
    const gone = new ApiError(401, { error: "signed_out" });
    expectDiagnostics({ warn: [["The session ended; reload to continue", gone]] });
    const { signIn, finish } = pendingSignIn({ ...me, lineDisplayName: "Alice B" });
    let answerSave = () => {};
    const saveAnswered = new Promise<void>((resolve) => (answerSave = resolve));
    const host = render(session({ signIn }), undefined, undefined, {
      early: earlyAs(me),
      claims: { ...ALICE_CLAIMS, name: "Alice B" },
      app: (
        <>
          <Board />
          <OptInSwitch answered={saveAnswered} />
        </>
      ),
    });
    await settle();
    expect(signIn).toHaveBeenCalledExactlyOnceWith(
      { accessToken: "token", language: "en" },
      accountSelection(me.id),
    );
    act(() => host.querySelector("button")?.click());
    act(() => reportSessionLost(gone, me.id));
    await settle();
    finish();
    await act(async () => answerSave());
    expect(host.textContent).not.toContain("Board of");
    expect(host.querySelector("button")?.textContent).toBe("Reload");
    expect(signIn).toHaveBeenCalledOnce();
  });
});

describe("SessionGate's waiting and failure screens", () => {
  it("says it's still opening, in the same status line, once the wait runs long", async () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const { signIn } = pendingSignIn(me);
    const host = render(session({ signIn }));
    await settle();
    const status = () => host.querySelector('[role="status"]')?.textContent;
    expect(status()).toBe("Opening your sticker board…");
    await act(() => vi.advanceTimersByTimeAsync(STILL_OPENING_MS));
    expect(status()).toContain("Still opening");
  });

  it("moves focus to the failure's heading, so it's announced, with the details apart from the message", async () => {
    const failure = new ApiError(0, { error: "network", detail: "GET /api/me got no answer" });
    const host = render(session({ signIn: () => Promise.reject(failure) }));
    await settle();
    expect(document.activeElement).toBe(host.querySelector("h1"));
    expect(host.querySelector(".line-gate__lead")?.textContent).toBe(errorMessage(failure));
    expect(host.querySelector(".copyable-fine-print__text")?.textContent).toContain(
      "GET /api/me got no answer",
    );
  });
});

it("accepts selected Hana when LIFF matches authenticated BIGWHEEL", async () => {
  const hana = {
    ...me,
    id: "hana",
    lineUserId: "dev-video-hana",
    lineDisplayName: "Hana",
    handle: "hana",
  };
  const envelope = sessionEnvelope(hana, {
    authenticated: me,
    selectionVersion: "selected-hana",
    expectedPrivySubject: "dev-video-hana",
    personSwitchMode: "verify",
  });
  const signIn = vi.fn<SessionApi["signIn"]>();
  const host = render(session({ me: () => Promise.resolve(envelope), signIn }));
  await settle();
  expect(host.textContent).toContain("Board of @hana");
  expect(signIn).not.toHaveBeenCalled();
});
it("rejects selected Hana when LIFF does not match the authenticated principal", async () => {
  const envelope = sessionEnvelope(
    { ...me, id: "hana", handle: "hana" },
    { authenticated: { ...me, lineUserId: "different-principal" } },
  );
  const host = render(session({ me: () => Promise.resolve(envelope) }));
  await settle();
  expect(host.textContent).not.toContain("Board of @hana");
});

it("restores a validated same-version session without dropping local save failures", async () => {
  let mounts = 0;
  function PendingSave() {
    const [failure, setFailure] = useState(() => {
      mounts += 1;
      return "unsaved position";
    });
    return <button onClick={() => setFailure("save failed; position retained")}>{failure}</button>;
  }
  const envelope = sessionEnvelope(me);
  const host = render(session({ me: () => Promise.resolve(envelope) }), undefined, undefined, {
    app: <PendingSave />,
  });
  await settle();
  act(() => host.querySelector("button")?.click());
  act(() => {
    suspendSession();
    requestSessionRestore({ ...envelope });
  });
  await settle();
  expect(host.textContent).toContain("save failed; position retained");
  expect(mounts).toBe(1);
  expect(() => requestSessionRestore({ ...envelope, selectionVersion: "different" })).toThrow(
    "session_account_changed",
  );
});
