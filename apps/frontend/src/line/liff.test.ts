// @vitest-environment happy-dom
import { createDevLineVerifier } from "@drawing-app/api/dev-sign-in";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockPerson } from "./liff";

/** A fresh tab's sessionStorage. */
const newTab = () => {
  const kept = new Map<string, string>();
  return {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => void kept.set(key, value),
  };
};

// LINE in a browser outside LINE.
const line = {
  init: async () => {},
  isLoggedIn: vi.fn(() => false),
  isInClient: () => false,
  getDecodedIDToken: () => ({ sub: "U1", name: "Bob" }),
  getProfile: async () => ({ userId: "U1", displayName: "Bob" }),
  login: vi.fn<(config: { redirectUri: string; disableAutoLogin?: boolean }) => void>(),
};

/** The app loading afresh against `line`, logged in or not, with LIFF started. */
async function openPage({ loggedIn }: { loggedIn: boolean }) {
  vi.stubEnv("VITE_LIFF_MOCK", "off");
  line.isLoggedIn.mockReturnValue(loggedIn);
  vi.resetModules();
  vi.doMock("@line/liff", () => ({ default: line }));
  const page = await import("./liff");
  await page.initLine();
  return page;
}

/** What each of LIFF's logins asked LINE Login for. */
const logins = () => line.login.mock.calls.map(([config]) => config);

/** A storage refusal with the other marker operations still available. */
function refuseStorage(operation: "getItem" | "setItem" | "removeItem", error: Error) {
  const stored = localStorage;
  vi.stubGlobal("localStorage", {
    getItem: stored.getItem.bind(stored),
    setItem: stored.setItem.bind(stored),
    removeItem: stored.removeItem.bind(stored),
    [operation]: () => {
      throw error;
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
  line.login.mockReset();
  vi.doUnmock("@line/liff");
  vi.unstubAllEnvs();
});

describe("LINE Login outside LINE", () => {
  it("keeps the requested redirect and disables auto login when the marker cannot be read", async () => {
    const page = await openPage({ loggedIn: false });
    const error = new Error("read refused");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    refuseStorage("getItem", error);

    page.lineLogin("https://example.com/board");

    expect(logins()).toStrictEqual([
      { redirectUri: "https://example.com/board", disableAutoLogin: true },
    ]);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("LINE"), error);
  });

  it("keeps the requested redirect when the marker cannot be saved", async () => {
    const page = await openPage({ loggedIn: false });
    const error = new Error("write refused");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    refuseStorage("setItem", error);

    page.lineLogin("https://example.com/board");

    expect(logins()).toStrictEqual([{ redirectUri: "https://example.com/board" }]);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("LINE"), error);
  });

  it("reaches ready when a returned login's marker cannot be removed", async () => {
    localStorage.setItem("draw.lineAutoLogin", "started");
    const error = new Error("remove refused");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    refuseStorage("removeItem", error);

    const page = await openPage({ loggedIn: true });

    expect(page.lineUserId()).toBe("U1");
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("LINE"), error);
  });

  it("still surfaces a LIFF login failure", async () => {
    const page = await openPage({ loggedIn: false });
    const error = new Error("LIFF login refused");
    line.login.mockImplementationOnce(() => {
      throw error;
    });

    expect(() => page.lineLogin("https://example.com/board")).toThrow(error);
  });

  it("uses auto login first, and stays in this browser once a login from it never came back", async () => {
    (await openPage({ loggedIn: false })).lineLogin();
    (await openPage({ loggedIn: false })).lineLogin();
    expect(logins()).toStrictEqual([
      { redirectUri: location.href },
      { redirectUri: location.href, disableAutoLogin: true },
    ]);
  });

  it("uses auto login again after a login that came back", async () => {
    (await openPage({ loggedIn: false })).lineLogin();
    await openPage({ loggedIn: true });
    (await openPage({ loggedIn: false })).lineLogin();
    expect(logins().at(-1)).toStrictEqual({ redirectUri: location.href });
  });

  it("keeps auto login off for good in a browser where a login once didn't come back", async () => {
    (await openPage({ loggedIn: false })).lineLogin();
    (await openPage({ loggedIn: false })).lineLogin();
    await openPage({ loggedIn: true });
    (await openPage({ loggedIn: false })).lineLogin();
    expect(logins().at(-1)).toStrictEqual({ redirectUri: location.href, disableAutoLogin: true });
  });
});

describe("LIFF Mock's person", () => {
  it("reports a completed mock initialization before page language can reach LIFF", async () => {
    vi.stubEnv("VITE_LIFF_MOCK", "");
    vi.resetModules();
    const { initLine } = await import("./liff");
    expect(await initLine()).toBe(true);
  });

  it("is LIFF Mock's own Brown until ?as= names someone", () => {
    expect(mockPerson("", newTab()).name).toBe("Brown");
  });

  it("is one person per name, in any letter case, and another for another name", () => {
    const tab = newTab();
    const alice = mockPerson("?as=alice", tab);
    expect(mockPerson("?as=Alice", tab)).toEqual(alice);
    expect(mockPerson("?as=bob", tab).sub).not.toBe(alice.sub);
  });

  it("stays for the tab when the address loses ?as=, until another name replaces it", () => {
    const tab = newTab();
    const alice = mockPerson("?as=alice", tab);
    expect(mockPerson("", tab)).toEqual(alice);
    const bob = mockPerson("?as=bob", tab);
    expect(mockPerson("", tab)).toEqual(bob);
    expect(mockPerson("", newTab()).name).toBe("Brown");
  });

  it("signs in to the REST API as the person LIFF Mock's profile names", async () => {
    // LIFF Mock answers even where a real-LINE .env switches it off; the module reads that as it loads.
    vi.stubEnv("VITE_LIFF_MOCK", "");
    vi.resetModules();
    const [{ default: liff }, { initLine }] = await Promise.all([
      import("@line/liff"),
      import("./liff"),
    ]);
    history.replaceState(null, "", "/?as=alice");
    await initLine();
    const profile = await liff.getProfile();
    const signedIn = await createDevLineVerifier().verifyAccessToken(liff.getAccessToken() ?? "");
    expect(signedIn).toEqual({ sub: profile.userId, name: profile.displayName });
    expect(signedIn).toEqual(mockPerson("?as=alice", newTab()));
  });
});

describe("LIFF initialization", () => {
  it("reports a failed real initialization and keeps its error visible", async () => {
    vi.stubEnv("VITE_LIFF_MOCK", "off");
    vi.resetModules();
    vi.doMock("@line/liff", () => ({ default: line }));
    const error = new Error("LINE refused to start");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(line, "init").mockRejectedValueOnce(error);
    const { initLine } = await import("./liff");

    expect(await initLine()).toBe(false);
    expect(logged).toHaveBeenCalledWith("LINE didn't start", error);
  });
});
