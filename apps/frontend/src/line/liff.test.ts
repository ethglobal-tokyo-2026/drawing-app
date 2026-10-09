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

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  line.login.mockReset();
  vi.doUnmock("@line/liff");
  vi.unstubAllEnvs();
});

describe("LINE Login outside LINE", () => {
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
