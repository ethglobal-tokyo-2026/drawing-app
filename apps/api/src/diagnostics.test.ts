import { stickerGiftEscrowAbi } from "@drawing-app/sticker-chain/contracts";
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
  getAddress,
  keccak256,
  stringToBytes,
  type Abi,
  type Hex,
} from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAUSE_MAX_LENGTH,
  diagnosticStep,
  failureCause,
  logFailure,
  logInfo,
  withRequestDiagnostics,
} from "./diagnostics.ts";
import { captureLogLines, type LogLines } from "./testing/logLines.ts";

let logs: LogLines;

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
  logs = captureLogLines();
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
      logs.entries
        .filter((entry) => entry.event === "mint.submitted")
        .map((entry) => entry.requestId),
    ).toEqual(["request-b", "request-a"]);
    logs.expectLogged("mint.completed", { requestId: "request-a", stickerId: "request-a" });
    logs.expectLogged("mint.completed", { requestId: "request-b", stickerId: "request-b" });
    for (const entry of logs.entries.filter((entry) => entry.event === "mint.completed")) {
      expect(entry.elapsedMs).toBeTypeOf("number");
    }
    logInfo("outside.request");
    expect(logs.entries.at(-1)?.requestId).toBeUndefined();
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
    const log = logs.entries.find((entry) => entry.event === "mint.confirm.failed");
    expect(log).toMatchObject({
      txHash,
      causes: [
        { name: "Error", status: 429, message: "RPC failed at [redacted-url]" },
        { name: "Error", code: -32000, message: "nonce too low; privateKey=[redacted]" },
      ],
    });
    const output = logs.raw.join("\n");
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
    expect(failureCause(new Error("x".repeat(CAUSE_MAX_LENGTH * 2)))).toHaveLength(
      CAUSE_MAX_LENGTH,
    );
  });

  it("logs a contract revert's decoded error, or its raw data when the ABI lacks the error", () => {
    const relayer = getAddress(`0x${"65d3".repeat(10)}`);
    const claimSignerRole = keccak256(stringToBytes("CLAIM_SIGNER_ROLE"));
    const giftId = keccak256(stringToBytes("gift 1"));
    /** claimGift reverting with `data`, as viem throws it when it reads the revert with `abi`. */
    const reverted = (abi: Abi, data: Hex) =>
      new ContractFunctionExecutionError(
        new ContractFunctionRevertedError({ abi, data, functionName: "claimGift" }),
        { abi, functionName: "claimGift", args: [giftId, relayer, 0n, "0x"] },
      );
    const unauthorized = encodeErrorResult({
      abi: stickerGiftEscrowAbi,
      errorName: "AccessControlUnauthorizedAccount",
      args: [relayer, claimSignerRole],
    });
    const badSignature = encodeErrorResult({
      abi: stickerGiftEscrowAbi,
      errorName: "ECDSAInvalidSignatureLength",
      args: [45n],
    });

    logFailure("chain.claim.submit.failed", reverted(stickerGiftEscrowAbi, unauthorized));
    logFailure("chain.claim.submit.failed", reverted(stickerGiftEscrowAbi, badSignature));
    logFailure("chain.claim.submit.failed", reverted([], unauthorized));

    expect(logs.entries.map((entry) => entry.causes)).toEqual([
      expect.arrayContaining([
        expect.objectContaining({
          revert: {
            errorName: "AccessControlUnauthorizedAccount",
            args: [relayer, claimSignerRole],
          },
        }),
      ]),
      expect.arrayContaining([
        expect.objectContaining({
          revert: { errorName: "ECDSAInvalidSignatureLength", args: ["45"] },
        }),
      ]),
      expect.arrayContaining([expect.objectContaining({ revert: { raw: unauthorized } })]),
    ]);
  });

  it("does not serialize extra fields or repeat cyclic error causes", () => {
    const error = new Error("cyclic cause");
    error.cause = error;
    const fields = { stickerId: "sticker-a", giftClaimToken: "must-stay-private" };
    logFailure("mint.failed", error, fields);
    expect(logs.entries[0]?.causes).toEqual([{ name: "Error", message: "cyclic cause" }]);
    expect(logs.raw[0]).not.toContain("must-stay-private");
  });
});
