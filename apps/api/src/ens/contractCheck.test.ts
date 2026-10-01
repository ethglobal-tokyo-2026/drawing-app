import { CROQUIS_PARENT_NAME } from "@drawing-app/sticker-chain/croquis-names";
import { getAddress } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChainUnavailableError, type ContractReads, type NamingState } from "../deps.ts";
import { fakeContractReads, TEST_CONTRACTS } from "../testing/fakes.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { checkContracts } from "./contractCheck.ts";
import { createNamingQueue } from "./naming.ts";

/** A StickerNFT from another deploy. */
const OTHER_NFT = getAddress(`0x${"e".repeat(40)}`);
/** The parent name of a deploy under another name. */
const OTHER_PARENT = "other.eth";
const { relayer, stickers, escrow, names, resolver } = TEST_CONTRACTS;

let logs: LogLines;

beforeEach(() => {
  logs = captureLogLines();
});
afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Sets a naming queue's state to what the contract check finds from `read`, starting from `from`,
 * and queues a job behind it. Settles once the job has run or been skipped.
 */
async function checkThenName(read: () => Promise<ContractReads>, from: NamingState = { on: true }) {
  const naming = createNamingQueue();
  naming.setState(checkContracts(read, from));
  const job = vi.fn(() => Promise.resolve());
  naming.enqueue("alice", job);
  await naming.idle();
  return { state: await naming.state(), job };
}

/** The line logged as `event`, as printed. */
function printed(event: string) {
  const entry = logs.entries.find((logged) => logged.event === event);
  expect(entry, `${event} is logged`).toBeDefined();
  return JSON.stringify(entry);
}

describe("the contract check", () => {
  it.each([
    { field: "namerRole", change: { relayerIsNamer: false }, involved: [names, relayer] },
    {
      field: "namesParent",
      change: { namesParent: OTHER_PARENT },
      involved: [names, OTHER_PARENT, CROQUIS_PARENT_NAME],
    },
    {
      field: "namesStickers",
      change: { namesStickers: OTHER_NFT },
      involved: [names, OTHER_NFT, stickers],
    },
    {
      field: "resolverStickers",
      change: { resolverStickers: OTHER_NFT },
      involved: [resolver, OTHER_NFT, stickers],
    },
  ])(
    "turns naming off when $field doesn't hold, naming what disagrees, and the queue skips each job saying why",
    async ({ field, change, involved }) => {
      const { state, job } = await checkThenName(async () => fakeContractReads(change));

      expect(state).toMatchObject({ on: false });
      expect(job).not.toHaveBeenCalled();
      expect(logs.entries).toContainEqual(
        expect.objectContaining({
          event: "chain.contracts.checked",
          [field]: false,
          naming: "off",
        }),
      );
      logs.expectLogged("ens.naming.skipped", { userId: "alice", status: "naming_off" });
      for (const address of involved) {
        expect(printed("chain.contracts.mismatch")).toContain(address);
        expect(printed("ens.naming.skipped")).toContain(address);
      }
    },
  );

  it.each([
    {
      field: "escrowSticker",
      change: { escrowSticker: OTHER_NFT },
      involved: [escrow, OTHER_NFT, stickers],
    },
    // An escrow from before the names under croquis.eth has no names() to ask.
    { field: "escrowNames", change: { escrowNames: null }, involved: [escrow] },
  ])(
    "logs a mismatch when $field doesn't hold, naming the addresses, and leaves naming on",
    async ({ field, change, involved }) => {
      const { state, job } = await checkThenName(async () => fakeContractReads(change));

      expect(state).toEqual({ on: true });
      expect(job).toHaveBeenCalledOnce();
      expect(logs.entries).toContainEqual(
        expect.objectContaining({ event: "chain.contracts.checked", [field]: false, naming: "on" }),
      );
      for (const address of involved)
        expect(printed("chain.contracts.mismatch")).toContain(address);
    },
  );

  it("leaves naming as it was when the RPC fails, logging the failure", async () => {
    const rpcDown = () => Promise.reject(new ChainUnavailableError("Reading CroquisNames failed"));

    const on = await checkThenName(rpcDown);
    expect(on.state).toEqual({ on: true });
    expect(on.job).toHaveBeenCalledOnce();
    logs.expectLogged("chain.contracts.check_failed", { naming: "on" });

    const off = await checkThenName(rpcDown, { on: false, reason: "An earlier check's mismatch" });
    expect(off.state).toMatchObject({ on: false });
    expect(off.job).not.toHaveBeenCalled();
  });
});
