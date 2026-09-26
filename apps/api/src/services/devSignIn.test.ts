import { afterEach, describe, expect, it, vi } from "vitest";
import { LineTokenInvalidError, type LineProfile, type LineVerifier } from "../deps.ts";
import {
  chooseLineVerifier,
  createDevLineVerifier,
  DEV_ID_TOKEN_PREFIX,
  devIdToken,
} from "./devSignIn.ts";

const ALICE: LineProfile = { sub: "dev-alice", name: "Alice", picture: "https://profile.test/a" };

/** A LINE that fails the test if it's asked. */
const line: LineVerifier = {
  verifyIdToken: () => Promise.reject(new Error("LINE was asked")),
};

const silenceWarnings = () => vi.spyOn(console, "warn").mockImplementation(() => {});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("dev sign-in's verifier", () => {
  it("trusts who a dev ID token names", async () => {
    await expect(createDevLineVerifier().verifyIdToken(devIdToken(ALICE))).resolves.toEqual(ALICE);
  });

  it("refuses LINE's own tokens, LIFF Mock's, and a dev token that names no one, as LINE refuses a bad token", async () => {
    const tokens = [
      "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJVMSJ9.c2lnbmF0dXJl",
      "id_token",
      `${DEV_ID_TOKEN_PREFIX}{"sub":`,
      DEV_ID_TOKEN_PREFIX + JSON.stringify({ name: ALICE.name }),
      DEV_ID_TOKEN_PREFIX.toUpperCase() + JSON.stringify(ALICE),
    ];
    const verifier = createDevLineVerifier();
    for (const token of tokens) {
      await expect(verifier.verifyIdToken(token)).rejects.toBeInstanceOf(LineTokenInvalidError);
    }
  });
});

describe("the server's LINE verifier", () => {
  it("is dev sign-in's when DEV_SIGN_IN is on, with a warning that anyone can sign in as anyone", async () => {
    const warn = silenceWarnings();
    const chosen = chooseLineVerifier("on", line);
    await expect(chosen.verifyIdToken(devIdToken(ALICE))).resolves.toEqual(ALICE);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("anyone can sign in as anyone"));
  });

  it("is LINE's, without a warning, when DEV_SIGN_IN is anything else", () => {
    const warn = silenceWarnings();
    for (const devSignIn of [undefined, "", "off"]) {
      expect(chooseLineVerifier(devSignIn, line)).toBe(line);
    }
    expect(warn).not.toHaveBeenCalled();
  });
});
