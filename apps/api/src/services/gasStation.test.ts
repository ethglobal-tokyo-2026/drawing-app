import { Inputs, Transaction, TransactionDataBuilder } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SponsorshipError } from "../sui/types.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import {
  createShinamiGasStation,
  GAS_STATION_DEADLINE_MS,
  SHINAMI_GAS_STATION_URL,
} from "./gasStation.ts";

const ACCESS_KEY = "us1_sui_testnet_secret";
const SENDER = `0x${"5".repeat(64)}`;
/** Unix seconds, an hour after the sponsorship, as Shinami sets it. */
const EXPIRE_AT_TIME = 1_791_000_000;

/**
 * A transaction kind with every kind of input the server's builders use: pure values, an owned
 * object, a mutable shared object and the clock. `calls` repeats its call.
 */
async function aKind(calls: number) {
  const tx = new Transaction();
  const owned = tx.object(
    Inputs.ObjectRef({
      objectId: `0x${"a1".repeat(32)}`,
      version: "7",
      digest: "11111111111111111111111111111111",
    }),
  );
  const shared = tx.object(
    Inputs.SharedObjectRef({
      objectId: `0x${"b2".repeat(32)}`,
      initialSharedVersion: "3",
      mutable: true,
    }),
  );
  for (let call = 0; call < calls; call++) {
    tx.moveCall({
      target: `0x${"c3".repeat(32)}::gift::deposit`,
      arguments: [
        shared,
        owned,
        tx.pure.vector("u8", [1, 2, 3]),
        tx.pure.u64(1_791_000_000_000n),
        tx.pure.address(SENDER),
        tx.object.clock(),
      ],
    });
  }
  return tx.build({ onlyTransactionKind: true });
}

/** The transaction Shinami makes of `kind` for `sender`, its own gas coin paying. */
function sponsorshipOf(kind: Uint8Array, sender: string) {
  const tx = Transaction.fromKind(kind);
  tx.setSender(sender);
  tx.setGasOwner(`0x${"6".repeat(64)}`);
  tx.setGasPrice(1_000);
  tx.setGasBudget(10_000_000);
  tx.setGasPayment([
    { objectId: `0x${"9".repeat(64)}`, version: "1", digest: "11111111111111111111111111111111" },
  ]);
  return tx.build();
}

const KIND = await aKind(1);
const TX_BYTES = await sponsorshipOf(KIND, SENDER);

/** Shinami's answer to a sponsorship of `txBytes`, TX_BYTES unless said. */
const sponsored = (
  txBytes = TX_BYTES,
  txDigest = TransactionDataBuilder.getDigestFromBytes(txBytes),
) => ({
  txBytes: toBase64(txBytes),
  txDigest,
  signature: toBase64(new Uint8Array([4, 4])),
  expireAtTime: EXPIRE_AT_TIME,
});

const result = (value: unknown) => Response.json({ jsonrpc: "2.0", id: 1, result: value });
const rpcError = (code: number, message: string, details?: string) =>
  Response.json({
    jsonrpc: "2.0",
    id: 1,
    error: { code, message, ...(details && { data: { details } }) },
  });

/** A request Shinami never answers, until its timeout aborts it. */
const STALL = "stall";

/** Shinami as a fake fetch plays it: each request gets the next answer, and is kept. */
function fakeShinami(...answers: (Response | Error | typeof STALL)[]) {
  const requests: { url: string; apiKey: string | null; body: unknown }[] = [];
  const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
    const request = new Request(input, init);
    requests.push({
      url: request.url,
      apiKey: request.headers.get("X-Api-Key"),
      body: await request.json(),
    });
    const answer = answers.shift();
    if (answer === undefined) throw new Error("Shinami was asked more often than the test expects");
    if (answer instanceof Error) throw answer;
    if (answer === STALL) {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    }
    return answer;
  });
  return { requests, gasStation: createShinamiGasStation({ accessKey: ACCESS_KEY, fetchImpl }) };
}

/** Runs `work` to its end, timers included: what it resolved to, or the error it rejected with. */
async function settled<T>(work: Promise<T>): Promise<{ value?: T; error?: unknown }> {
  const outcome = work.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await vi.runAllTimersAsync();
  return outcome;
}

let logs: LogLines;
beforeEach(() => {
  logs = captureLogLines();
  vi.useFakeTimers();
  // Node's own AbortSignal.timeout runs on the real clock, which the fake one doesn't move.
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException("The request timed out", "TimeoutError")),
      ms,
    );
    return controller.signal;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  expect(logs.raw.join("\n")).not.toContain(ACCESS_KEY);
});

describe("Shinami Gas Station", () => {
  it("sponsors a transaction kind for its sender, and answers Shinami's sponsorship", async () => {
    const shinami = fakeShinami(result(sponsored()));
    await expect(shinami.gasStation.sponsor(KIND, SENDER)).resolves.toEqual({
      digest: sponsored().txDigest,
      txBytes: sponsored().txBytes,
      sponsorSignature: sponsored().signature,
      expiresAt: new Date(EXPIRE_AT_TIME * 1000),
    });
    expect(shinami.requests).toEqual([
      {
        url: SHINAMI_GAS_STATION_URL,
        apiKey: ACCESS_KEY,
        body: {
          jsonrpc: "2.0",
          id: 1,
          method: "gas_sponsorTransactionBlock",
          params: [toBase64(KIND), SENDER],
        },
      },
    ]);
  });

  it("refuses a sponsorship whose digest isn't its bytes'", async () => {
    const shinami = fakeShinami(result(sponsored(TX_BYTES, "11111111111111111111111111111111")));
    await expect(shinami.gasStation.sponsor(KIND, SENDER)).rejects.toThrow(/digest/);
  });

  it.each([
    { other: "kind", txBytes: async () => sponsorshipOf(await aKind(2), SENDER) },
    { other: "sender", txBytes: () => sponsorshipOf(KIND, `0x${"7".repeat(64)}`) },
  ])("refuses a sponsorship of another $other than was asked for", async ({ txBytes }) => {
    const shinami = fakeShinami(result(sponsored(await txBytes())));
    const { error } = await settled(shinami.gasStation.sponsor(KIND, SENDER));
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(SponsorshipError);
  });

  it.each([
    { code: -32602, reason: "refused", requests: 1 },
    { code: -2, reason: "fund_empty", requests: 1 },
    { code: -1, reason: "unavailable", requests: 2 },
    { code: -32010, reason: "unavailable", requests: 2 },
  ])(
    "answers JSON-RPC error $code as $reason, in Shinami's words",
    async ({ code, reason, requests }) => {
      const shinami = fakeShinami(
        rpcError(code, "Invalid params", "MoveAbort in 1st command"),
        rpcError(code, "Invalid params", "MoveAbort in 1st command"),
      );
      const { error } = await settled(shinami.gasStation.sponsor(KIND, SENDER));
      expect(error).toBeInstanceOf(SponsorshipError);
      expect(error).toMatchObject({ reason, message: "Invalid params: MoveAbort in 1st command" });
      expect(shinami.requests).toHaveLength(requests);
      logs.expectLogged("sponsor.failed", { stage: "gas_sponsorTransactionBlock", reason });
    },
  );

  it("retries once when Shinami couldn't answer, and answers the retry's sponsorship", async () => {
    const shinami = fakeShinami(new TypeError("fetch failed"), result(sponsored()));
    const { value } = await settled(shinami.gasStation.sponsor(KIND, SENDER));
    expect(value?.digest).toBe(sponsored().txDigest);
    expect(shinami.requests).toHaveLength(2);
    logs.expectLogged("sponsor.retrying", { stage: "gas_sponsorTransactionBlock" });
  });

  it("gives up as unavailable at its deadline when Shinami stalls, without asking again, since it may have sponsored", async () => {
    const shinami = fakeShinami(STALL, STALL);
    const started = Date.now();
    const { error } = await settled(shinami.gasStation.sponsor(KIND, SENDER));
    expect(error).toMatchObject({ name: "SponsorshipError", reason: "unavailable" });
    expect(shinami.requests).toHaveLength(1);
    expect(Date.now() - started).toBeLessThanOrEqual(GAS_STATION_DEADLINE_MS);
  });

  it.each([401, 403])(
    "rejects a refused access key (HTTP %i) as the server's own fault, without a retry",
    async (status) => {
      const shinami = fakeShinami(new Response("Unauthorized", { status }));
      const { error } = await settled(shinami.gasStation.sponsor(KIND, SENDER));
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(SponsorshipError);
      expect(shinami.requests).toHaveLength(1);
    },
  );

  it("reads the fund's balance less what's in flight", async () => {
    const shinami = fakeShinami(
      result({
        network: "SUI_TESTNET",
        name: "fund",
        balance: 4_870_000_000,
        inFlight: 70_000_000,
      }),
    );
    await expect(shinami.gasStation.available()).resolves.toBe(4_800_000_000n);
    expect(shinami.requests[0]?.body).toMatchObject({ method: "gas_getFund", params: [] });
  });
});
