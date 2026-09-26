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

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllEnvs();
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
    const signedIn = await createDevLineVerifier().verifyIdToken(liff.getIDToken() ?? "");
    expect(signedIn).toEqual({ sub: profile.userId, name: profile.displayName });
    expect(signedIn).toEqual(mockPerson("?as=alice", newTab()));
  });
});
