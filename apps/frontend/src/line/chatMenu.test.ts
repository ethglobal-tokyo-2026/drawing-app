import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "../api/httpApi";

// It asks once per page load, so each test gets its own copy of the module.
const freshChatMenu = async () => {
  vi.resetModules();
  return import("./chatMenu");
};

/** The app's server, answering every request with `status` and `body`. */
const server = (status: number, body: object) =>
  vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body), { status })));

const urlOf = (input: RequestInfo | URL | undefined) =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("linking the chat menu", () => {
  it("asks the app's server once per page load, and records what LINE shows", async () => {
    const { linkChatMenu, chatMenuStatus } = await freshChatMenu();
    const fetch = server(200, { chatMenu: { status: "linked", menu: "2" } });
    expect(chatMenuStatus()).toEqual({ state: "waiting" });
    await linkChatMenu(createServerClient(fetch));
    await linkChatMenu(createServerClient(fetch));

    expect(fetch).toHaveBeenCalledTimes(1);
    const [input, init] = fetch.mock.calls[0] ?? [];
    expect(urlOf(input)).toMatch(/\/api\/line-menu$/);
    expect(init?.method).toBe("POST");
    expect(chatMenuStatus()).toEqual({
      state: "answered",
      link: { status: "linked", menu: "2" },
    });
  });

  it("records a menu that's off, with the server's reason", async () => {
    const { linkChatMenu, chatMenuStatus } = await freshChatMenu();
    const off = { status: "off", reason: "dev_sign_in" };
    await linkChatMenu(createServerClient(server(200, { chatMenu: off })));
    expect(chatMenuStatus()).toEqual({ state: "answered", link: off });
  });

  it("records a refusal or an unreachable server as a failure, without throwing", async () => {
    const refused = await freshChatMenu();
    await refused.linkChatMenu(createServerClient(server(502, { error: "line_unavailable" })));
    const status = refused.chatMenuStatus();
    expect(status.state === "failed" && status.reason).toContain("502 line_unavailable");

    const unreachable = await freshChatMenu();
    const noAnswer = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(unreachable.linkChatMenu(createServerClient(noAnswer))).resolves.toBeUndefined();
    expect(unreachable.chatMenuStatus()).toMatchObject({ state: "failed" });
  });
});
