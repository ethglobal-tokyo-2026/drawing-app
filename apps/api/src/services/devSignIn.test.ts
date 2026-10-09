import { afterEach, describe, expect, it, vi } from "vitest";
import { LineTokenInvalidError, type LineProfile, type LineVerifier } from "../deps.ts";
import {
  chooseLineVerifier,
  createDevLineVerifier,
  DEV_ACCESS_TOKEN_PREFIX,
  devAccessToken,
} from "./devSignIn.ts";

const ALICE: LineProfile = { sub: "dev-alice", name: "Alice", picture: "https://profile.test/a" };

/** A LINE that fails the test if it's asked. */
const line: LineVerifier = {
  verifyAccessToken: () => Promise.reject(new Error("LINE was asked")),
};

const silenceWarnings = () => vi.spyOn(console, "warn").mockImplementation(() => {});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("dev sign-in's verifier", () => {
  it("trusts who a dev access token names", async () => {
    await expect(createDevLineVerifier().verifyAccessToken(devAccessToken(ALICE))).resolves.toEqual(
      ALICE,
    );
  });

  it("refuses LINE's own tokens, LIFF Mock's, and a dev token that names no one, as LINE refuses a bad token", async () => {
    const tokens = [
      "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJVMSJ9.c2lnbmF0dXJl",
      "id_token",
      `${DEV_ACCESS_TOKEN_PREFIX}{"sub":`,
      DEV_ACCESS_TOKEN_PREFIX + JSON.stringify({ name: ALICE.name }),
      DEV_ACCESS_TOKEN_PREFIX.toUpperCase() + JSON.stringify(ALICE),
    ];
    const verifier = createDevLineVerifier();
    for (const token of tokens) {
      await expect(verifier.verifyAccessToken(token)).rejects.toBeInstanceOf(LineTokenInvalidError);
    }
  });
});

describe("the server's LINE verifier", () => {
  it("is dev sign-in's when DEV_SIGN_IN is on, with a warning that anyone can sign in as anyone", async () => {
    const warn = silenceWarnings();
    const chosen = chooseLineVerifier("on", line);
    await expect(chosen.verifyAccessToken(devAccessToken(ALICE))).resolves.toEqual(ALICE);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("anyone can sign in as anyone"));
  });

  it("still asks LINE about LINE's own tokens when DEV_SIGN_IN is on", async () => {
    silenceWarnings();
    const bob: LineProfile = { sub: "U-bob", name: "Bob" };
    const asked: string[] = [];
    const realLine: LineVerifier = {
      verifyAccessToken: (accessToken) => {
        asked.push(accessToken);
        return Promise.resolve(bob);
      },
    };
    const chosen = chooseLineVerifier("on", realLine);
    await expect(chosen.verifyAccessToken("eyJhbGciOiJFUzI1NiJ9.e30.c2ln")).resolves.toEqual(bob);
    await expect(chosen.verifyAccessToken(devAccessToken(ALICE))).resolves.toEqual(ALICE);
    expect(asked).toEqual(["eyJhbGciOiJFUzI1NiJ9.e30.c2ln"]);
  });

  it("is LINE's, without a warning, when DEV_SIGN_IN is anything else", () => {
    const warn = silenceWarnings();
    for (const devSignIn of [undefined, "", "off"]) {
      expect(chooseLineVerifier(devSignIn, line)).toBe(line);
    }
    expect(warn).not.toHaveBeenCalled();
  });
});
