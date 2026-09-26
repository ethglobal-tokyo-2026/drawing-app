// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { errorMessage } from "../i18n/errorMessage";
import { currentLanguage, i18next } from "../i18n/i18n";
import { keepChosenLanguage, readChosenLanguage } from "../i18n/language";
import { ApiError } from "./apiClient";
import type { Me } from "@drawing-app/api/client";
import type { SessionApi } from "./httpApi";
import { useMe } from "./meContext";
import { SessionGate } from "./SessionGate";
import "./testing";

const me: Me = {
  id: "u1",
  handle: "alice",
  lineDisplayName: "Alice",
  linePictureUrl: null,
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

function render(session: SessionApi, idToken: () => string | null = () => "token") {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <SessionGate session={session} idToken={idToken}>
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
  me: () => Promise.resolve({ me }),
  setHandle: () => Promise.reject(new Error("not expected")),
  ...overrides,
});

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

  it("says why sign-in failed, and Try again signs in again", async () => {
    const refusal = new ApiError(401, { error: "line_token_invalid" });
    const signIn = vi
      .fn<SessionApi["signIn"]>()
      .mockRejectedValueOnce(refusal)
      .mockResolvedValueOnce({ me });
    const host = render(session({ signIn }));
    await settle();
    expect(host.textContent).toContain("Couldn’t sign you in");
    expect(host.textContent).toContain(errorMessage(refusal));
    expect(host.textContent).toContain("line_token_invalid");
    act(() => host.querySelector("button")?.click());
    await settle();
    expect(host.textContent).toContain("Board of @alice");
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
