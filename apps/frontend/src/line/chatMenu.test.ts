import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const liff = vi.hoisted(() => ({ getIDToken: vi.fn<() => string | null>() }));
vi.mock("@line/liff", () => ({ default: liff }));

// It asks once per page load, so each test gets its own copy of the module.
const freshChatMenu = async () => {
  vi.resetModules();
  return import("./chatMenu");
};

const server = (status: number, body: object) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  liff.getIDToken.mockReturnValue("line-id-token");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("asking for the returning-user chat menu", () => {
  it("sends LINE's ID token and the app's language once per page load, and records the menu the server set", async () => {
    const { requestReturningMenu, chatMenuStatus } = await freshChatMenu();
    const { i18next } = await import("../i18n/i18n");
    await i18next.changeLanguage("ja");
    const fetch = server(200, { menu: "returning" });
    vi.stubGlobal("fetch", fetch);
    await requestReturningMenu();
    await requestReturningMenu();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/v1/auth/line-menu",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "line-id-token", language: "ja" }),
      }),
    );
    expect(chatMenuStatus()).toEqual({ state: "returning" });
  });

  it("keeps the new-user menu with the server's reason", async () => {
    const { requestReturningMenu, chatMenuStatus } = await freshChatMenu();
    vi.stubGlobal("fetch", server(200, { menu: "new", reason: "not_a_friend" }));
    await requestReturningMenu();
    expect(chatMenuStatus()).toEqual({ state: "new", reason: "not_a_friend" });
  });

  it("records a refusal or an unreachable server as a failure, without throwing", async () => {
    const refused = await freshChatMenu();
    vi.stubGlobal("fetch", server(401, { error: "line_auth_failed" }));
    await refused.requestReturningMenu();
    const status = refused.chatMenuStatus();
    expect(status.state === "failed" && status.reason).toContain("401 line_auth_failed");

    const unreachable = await freshChatMenu();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(unreachable.requestReturningMenu()).resolves.toBeUndefined();
    expect(unreachable.chatMenuStatus()).toMatchObject({ state: "failed" });
  });

  it("asks nothing without an ID token, and asks once a later sign-in has one", async () => {
    const { requestReturningMenu, chatMenuStatus } = await freshChatMenu();
    const fetch = server(200, { menu: "returning" });
    vi.stubGlobal("fetch", fetch);
    liff.getIDToken.mockReturnValue(null);
    await requestReturningMenu();
    expect(fetch).not.toHaveBeenCalled();
    expect(chatMenuStatus()).toMatchObject({ state: "failed" });

    liff.getIDToken.mockReturnValue("line-id-token");
    await requestReturningMenu();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(chatMenuStatus()).toEqual({ state: "returning" });
  });
});
