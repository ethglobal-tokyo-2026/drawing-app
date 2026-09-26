import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  diagnosticStep,
  failureCause,
  logFailure,
  logInfo,
  withRequestDiagnostics,
} from "./diagnostics.ts";

const entrySchema = z.object({
  event: z.string(),
  requestId: z.string().optional(),
  stickerId: z.string().optional(),
  txHash: z.string().optional(),
  elapsedMs: z.number().optional(),
  causes: z
    .array(
      z.object({
        name: z.string(),
        message: z.string(),
        code: z.union([z.string(), z.number()]).optional(),
        status: z.number().optional(),
        details: z.string().optional(),
      }),
    )
    .optional(),
});
let entries: z.infer<typeof entrySchema>[];
let raw: string[];

function deferred() {
  let resolve: () => void = () => {
    throw new Error("Promise resolver has not been initialized");
  };
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  entries = [];
  raw = [];
  const collect = (value: unknown) => {
    if (typeof value !== "string") throw new Error("Expected one structured log line");
    raw.push(value);
    entries.push(entrySchema.parse(JSON.parse(value)));
  };
  vi.spyOn(console, "info").mockImplementation(collect);
  vi.spyOn(console, "error").mockImplementation(collect);
});
afterEach(() => vi.restoreAllMocks());

describe("NFT diagnostics", () => {
  it("keeps concurrent request contexts separate through asynchronous work", async () => {
    const first = deferred();
    const second = deferred();
    const request = (requestId: string, waiting: Promise<void>) =>
      withRequestDiagnostics({ requestId, method: "POST", route: "/api/stickers" }, () =>
        diagnosticStep("mint", { stickerId: requestId }, async () => {
          await waiting;
          logInfo("mint.submitted", { txHash: `0x${"12".repeat(32)}` });
          return requestId;
        }),
      );
    const a = request("request-a", first.promise);
    const b = request("request-b", second.promise);
    second.resolve();
    await expect(b).resolves.toBe("request-b");
    first.resolve();
    await expect(a).resolves.toBe("request-a");
    expect(
      entries.filter((entry) => entry.event === "mint.submitted").map((entry) => entry.requestId),
    ).toEqual(["request-b", "request-a"]);
    expect(entries.filter((entry) => entry.event === "mint.completed")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId: "request-a",
          stickerId: "request-a",
        }),
        expect.objectContaining({
          requestId: "request-b",
          stickerId: "request-b",
        }),
      ]),
    );
    for (const entry of entries.filter((entry) => entry.event === "mint.completed")) {
      expect(entry.elapsedMs).toBeTypeOf("number");
    }
    logInfo("outside.request");
    expect(entries.at(-1)?.requestId).toBeUndefined();
  });

  it("preserves RPC causes and submitted hashes while omitting secrets and request payloads", async () => {
    const secret = `0x${"cd".repeat(32)}`;
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbGljZSJ9.signature";
    const cause = Object.assign(new Error(`nonce too low; privateKey=${secret}`), { code: -32000 });
    const failure = Object.assign(new Error("full SDK payload must not be logged"), {
      shortMessage: `RPC failed at https://user:password@rpc.test/v2/provider-secret?key=secret`,
      details: `Authorization: Bearer auth-secret\nCookie: session=cookie-secret\napiKey=api-secret giftClaimToken=${secret} jwt=${jwt}\nnonce too low`,
      cause,
      status: 429,
      metaMessages: ["signed request private information"],
      request: { body: { giftClaimToken: secret } },
    });
    const txHash = `0x${"ab".repeat(32)}`;
    await expect(
      diagnosticStep("mint.confirm", { txHash }, () => Promise.reject(failure)),
    ).rejects.toBe(failure);
    const log = entries.find((entry) => entry.event === "mint.confirm.failed");
    expect(log).toMatchObject({
      txHash,
      causes: [
        { name: "Error", status: 429, message: "RPC failed at [redacted-url]" },
        { name: "Error", code: -32000, message: "nonce too low; privateKey=[redacted]" },
      ],
    });
    const output = raw.join("\n");
    for (const value of [
      secret,
      jwt,
      "provider-secret",
      "auth-secret",
      "cookie-secret",
      "api-secret",
      "full SDK payload",
      "signed request private information",
    ]) {
      expect(output).not.toContain(value);
    }
    expect(output).toContain("nonce too low");
  });

  it("names a failure's cause in its innermost words, masked, for the person's own error", () => {
    const rpc = Object.assign(new Error("HTTP request failed."), {
      details: "rate limit exceeded",
      shortMessage: "RPC failed at https://eth-sepolia.g.alchemy.com/v2/rpc-key-secret",
    });
    const mint = Object.assign(new Error("full SDK payload"), {
      shortMessage: "Request exceeds defined limit.",
      cause: rpc,
    });
    expect(failureCause(mint)).toBe("rate limit exceeded");
    const keyed = new Error(
      "request to https://eth-sepolia.g.alchemy.com/v2/rpc-key-secret timed out",
    );
    expect(failureCause(keyed)).toBe("request to [redacted-url] timed out");
    expect(failureCause(new Error("x".repeat(400)))).toHaveLength(160);
  });

  it("does not serialize extra fields or repeat cyclic error causes", () => {
    const error = new Error("cyclic cause");
    error.cause = error;
    const fields = { stickerId: "sticker-a", giftClaimToken: "must-stay-private" };
    logFailure("mint.failed", error, fields);
    expect(entries[0]?.causes).toEqual([{ name: "Error", message: "cyclic cause" }]);
    expect(raw[0]).not.toContain("must-stay-private");
  });
});
