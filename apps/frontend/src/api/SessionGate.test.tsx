// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { errorMessage } from "../i18n/errorMessage";
import { currentLanguage, i18next } from "../i18n/i18n";
import { keepChosenLanguage, readChosenLanguage } from "../i18n/language";
import type { LineClaims } from "../line/liff";
import { ApiError } from "./apiClient";
import type { Me } from "@drawing-app/api/client";
import type { EarlySession } from "./earlySession";
import type { SessionApi } from "./httpApi";
import { useMe } from "./meContext";
import { SessionGate } from "./SessionGate";
import "./testing";

const me: Me = {
  id: "u1",
  handle: "alice",
  lineDisplayName: "Alice",
  linePictureUrl: null,
  ensName: "alice.croquis.eth",
  lineUserId: "line-alice",
  timeZone: "Asia/Tokyo",
  language: "en",
  languageChoice: null,
  createdAt: "2026-09-26T00:00:00.000Z",
  needsHandle: false,
  newStickerCount: 0,
  unseenGratitudeCount: 0,
};

/** The app behind the gate; its `lang` is the app's language as it first opens. */
function Board() {
  const [language] = useState(currentLanguage);
  return <p lang={language}>Board of @{useMe().handle}</p>;
}

const settle = () => act(() => Promise.resolve());
let cleanup = () => {};
afterEach(() => cleanup());
vi.spyOn(console, "error").mockImplementation(() => {});

/** Who LINE's ID token names: Alice, as the server last heard of her. */
const ALICE_CLAIMS: LineClaims = { sub: "line-alice", name: "Alice" };

function render(
  session: SessionApi,
  idToken: () => string | null = () => "token",
  reconnect = vi.fn<() => Promise<void>>().mockResolvedValue(),
  {
    early = null,
    claims = ALICE_CLAIMS,
  }: { early?: EarlySession | null; claims?: LineClaims } = {},
) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <SessionGate
        session={session}
        idToken={idToken}
        claims={() => claims}
        currentLineUserId={() => claims.sub}
        early={early}
        reconnect={reconnect}
      >
        <Board />
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
  signIn: () => Promise.resolve({ me }),
  me: () => Promise.reject(new ApiError(401, { error: "signed_out" })),
  setHandle: () => Promise.reject(new Error("not expected")),
  signOut: () => Promise.resolve(),
  ...overrides,
});

/** The session the cookie held as the app started: `you`, or none. */
const earlyAs = (you: Me | null) => ({
  me: Promise.resolve(you),
  accept: vi.fn<EarlySession["accept"]>(),
  drop: vi.fn<EarlySession["drop"]>(),
});

/** A sign-in that waits until `finish` is called. */
function pendingSignIn(answer: Me) {
  let finish = () => {};
  const signIn = vi.fn(
    () =>
      new Promise<{ me: Me }>((resolve) => {
        finish = () => resolve({ me: answer });
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
  it("resumes the matching server session without reading or exchanging an old LINE token", async () => {
    const resume = vi.fn<SessionApi["me"]>().mockResolvedValue({ me });
    const signIn = vi.fn<SessionApi["signIn"]>();
    const idToken = vi.fn(() => "expired-token");
    const host = render(session({ me: resume, signIn }), idToken);
    await settle();
    expect(resume).toHaveBeenCalledWith("line-alice");
    expect(signIn).not.toHaveBeenCalled();
    expect(idToken).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Board of @alice");
  });

  it("signs in with LINE's token, your zone and the app's language, then opens the app as you", async () => {
    await i18next.changeLanguage("ja");
    onTestFinished(async () => {
      await i18next.changeLanguage("en");
    });
    const signIn = vi.fn(() => Promise.resolve({ me }));
    const host = render(session({ signIn }));
    expect(host.textContent).not.toContain("Board");
    await settle();
    expect(signIn).toHaveBeenCalledWith({
      idToken: "token",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: "ja",
    });
    expect(host.textContent).toContain("Board of @alice");
  });

  it.each([
    ["ja", "en", "ja"],
    [null, "ja", "en"],
  ] as const)(
    "opens in the account's language choice (%s) over this device's (%s), which then keeps it",
    async (account, device, opensIn) => {
      keepChosenLanguage(device);
      await i18next.changeLanguage(device);
      onTestFinished(async () => {
        localStorage.clear();
        await i18next.changeLanguage("en");
      });
      const signIn = () => Promise.resolve({ me: { ...me, languageChoice: account } });
      const host = render(session({ signIn }));
      await settle();
      expect(host.querySelector("p")?.lang).toBe(opensIn);
      expect(readChosenLanguage()).toBe(account);
    },
  );

  it("retries a temporary server failure without restarting LINE authentication", async () => {
    const refusal = new ApiError(503, { error: "internal_error" });
    const reconnect = vi.fn<() => Promise<void>>().mockResolvedValue();
    const signIn = vi
      .fn<SessionApi["signIn"]>()
      .mockRejectedValueOnce(refusal)
      .mockResolvedValueOnce({ me });
    const host = render(session({ signIn }), () => "token", reconnect);
    await settle();
    expect(host.textContent).toContain("Couldn’t sign you in");
    expect(host.textContent).toContain(errorMessage(refusal));
    expect(host.textContent).toContain("internal_error");
    act(() => host.querySelector("button")?.click());
    await settle();
    expect(host.textContent).toContain("Board of @alice");
    expect(reconnect).not.toHaveBeenCalled();
  });

  it.each(["line_token_invalid", "line_token_expired"])(
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
      .mockResolvedValueOnce({ me });
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
    expect(host.textContent).toContain("Couldn't reconnect with LINE");
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
          Promise.resolve({ me: { ...me, handle: null, needsHandle: true, languageChoice: "ja" } }),
      }),
    );
    await settle();
    expect(readChosenLanguage()).toBe("ja");
    expect(host.querySelector("form")).not.toBeNull();
    expect(host.textContent).not.toContain("Board of");
  });

  it("says why it can't sign in when LINE can't give a token, and never asks the server", async () => {
    const signIn = vi.fn(() => Promise.resolve({ me }));
    const host = render(session({ signIn }), () => {
      throw new Error("LIFF has no ID token for this login");
    });
    await settle();
    expect(host.textContent).toContain("Couldn’t sign you in");
    expect(host.textContent).toContain("LIFF has no ID token for this login");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("asks for a handle when yours is taken, keeps the app shut until one saves, then opens", async () => {
    const setHandle = vi
      .fn<SessionApi["setHandle"]>()
      .mockRejectedValueOnce(new ApiError(409, { error: "handle_taken" }))
      .mockResolvedValueOnce({ me: { ...me, handle: "alice2" } });
    const host = render(
      session({
        signIn: () => Promise.resolve({ me: { ...me, handle: null, needsHandle: true } }),
        setHandle,
      }),
    );
    await settle();
    const input = host.querySelector("input");
    if (!input) throw new Error("no handle field");

    type(input, "@alice");
    submit(host);
    await settle();
    expect(setHandle).toHaveBeenLastCalledWith("alice");
    expect(host.textContent).toContain("@alice is taken");
    expect(host.textContent).not.toContain("Board");

    type(input, "alice2");
    submit(host);
    await settle();
    expect(host.textContent).toContain("Board of @alice2");
  });
});

describe("SessionGate with the cookie from the last visit", () => {
  it("opens as the cookie's person when LINE's user is theirs, without signing in again", async () => {
    const signIn = vi.fn(() => Promise.resolve({ me }));
    const early = earlyAs(me);
    const host = render(session({ signIn }), undefined, undefined, { early });
    await settle();
    expect(host.textContent).toContain("Board of @alice");
    expect(signIn).not.toHaveBeenCalled();
    expect(early.accept).toHaveBeenCalledWith(me);
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
    const signIn = vi.fn(() => Promise.resolve({ me }));
    const early = earlyAs(null);
    const host = render(session({ signIn }), undefined, undefined, { early });
    await settle();
    expect(signIn).toHaveBeenCalledOnce();
    expect(early.drop).toHaveBeenCalled();
    expect(host.textContent).toContain("Board of @alice");
  });

  it.each([
    ["a new LINE name", { ...ALICE_CLAIMS, name: "Alice B" }, me],
    ["a new LINE picture", { ...ALICE_CLAIMS, picture: "https://profile.line-scdn.net/a" }, me],
    ["LINE's language changing", ALICE_CLAIMS, { ...me, language: "ja" as const }],
  ])(
    "opens at once after %s, and signs in with LINE behind it to bring it to the account",
    async (_change, claims, cookies) => {
      const { signIn, finish } = pendingSignIn({ ...cookies, handle: "alice-renamed" });
      const host = render(session({ signIn }), undefined, undefined, {
        early: earlyAs(cookies),
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
});
