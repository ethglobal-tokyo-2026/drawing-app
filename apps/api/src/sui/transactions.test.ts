import { GIFT_EXPIRY_MS, gifts, stickers, suiTransactions } from "@drawing-app/db";
import {
  bytes32,
  createTestDb,
  insertSticker,
  insertUser,
  packGift,
  type TestDb,
} from "@drawing-app/db/testing";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64 } from "@mysten/sui/utils";
import { getZkLoginSignature } from "@mysten/sui/zklogin";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChainUnavailableError } from "../deps.ts";
import { fakeClock } from "../testing/fakes.ts";
import { fakeSui, type FakeSui } from "../testing/fakeSui.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import {
  drop,
  follow,
  runAsServer,
  runSigned,
  SETTLE_GRACE_MS,
  SignatureInvalidError,
  sponsored,
  type SuiEvents,
  type SuiTransaction,
  type SuiTransactionDeps,
} from "./transactions.ts";
import { TransactionRefusedError } from "./types.ts";

const RECEIVER = `0x${"7".repeat(64)}`;

let db: TestDb;
let clock: ReturnType<typeof fakeClock>;
let chain: FakeSui;
let deps: SuiTransactionDeps;
let logs: LogLines;
/** The giver's Privy Sui wallet. */
let wallet: Ed25519Keypair;
let userId: string;
let stickerId: string;
let giftId: string;

beforeEach(async () => {
  logs = captureLogLines();
  ({ db } = await createTestDb());
  clock = fakeClock();
  chain = fakeSui(clock);
  deps = { db, clock, sui: chain.sui, gasStation: chain.gasStation };
  wallet = Ed25519Keypair.generate();
  userId = insertUser(db);
  stickerId = insertSticker(db, userId);
  giftId = packGift(db, stickerId, userId);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A deposit for the giver's wallet to sign: the test's gift unless said. */
async function sponsorDeposit({
  sticker = stickerId,
  gift = giftId,
  alongside,
}: { sticker?: string; gift?: string; alongside?: Parameters<typeof sponsored>[3] } = {}) {
  const sender = wallet.toSuiAddress();
  const kind = await chain.sui.depositKind({
    sender,
    stickerObjectId: chain.stickerObjectIdOf(sticker),
    giftId: gift,
    claimCommitment: bytes32(`commitment ${gift}`),
    expiresAt: new Date(clock.now().getTime() + GIFT_EXPIRY_MS),
  });
  return sponsored(
    deps,
    { kind: "deposit", sender, userId, stickerId: sticker, giftId: gift },
    kind,
    alongside,
  );
}

/** A claim of the test's gift, which the server sends. */
const sponsorClaim = async () =>
  sponsored(deps, { kind: "claim", giftId }, await chain.sui.claimKind(giftId, RECEIVER));

/** `by`'s signature over the transaction's bytes: the giver's wallet's unless said. */
const signatureOf = async (row: SuiTransaction, by = wallet) =>
  (await by.signTransaction(fromBase64(row.txBytes))).signature;

/** A deposit the giver signed whose submission's answer never came back. */
async function lostDeposit() {
  const deposit = await sponsorDeposit();
  chain.answerNext("lost");
  return (await runSigned(deps, deposit, await signatureOf(deposit))).row;
}

const stored = (row: SuiTransaction) =>
  db.select().from(suiTransactions).where(eq(suiTransactions.id, row.id)).get();

describe("sponsored", () => {
  it("inserts the open row of Shinami's sponsorship, sent by the person, or by the server for its own kinds", async () => {
    const deposit = await sponsorDeposit();
    expect(deposit).toMatchObject({
      kind: "deposit",
      sender: wallet.toSuiAddress(),
      userId,
      stickerId,
      giftId,
      ...chain.sponsorships[0]?.sponsorship,
      senderSignature: null,
      submittedAt: null,
      outcome: null,
    });
    logs.expectLogged("sui.tx.sponsored", {
      kind: "deposit",
      txDigest: deposit.digest,
      giftId,
      stickerId,
      userId,
    });

    drop(deps, deposit);
    const claim = await sponsorClaim();
    expect(claim.sender).toBe(chain.sui.server);
    expect(chain.sponsorships.map(({ sender }) => sender)).toEqual([
      wallet.toSuiAddress(),
      chain.sui.server,
    ]);
  });

  it("writes what goes alongside in the row's database transaction, so a lost race writes neither", async () => {
    const another = insertSticker(db, userId);
    const anotherGift = bytes32("another gift");
    const packAnother = { sticker: another, gift: anotherGift };
    const alongside: Parameters<typeof sponsored>[3] = (tx) => {
      tx.insert(gifts)
        .values({
          id: anotherGift,
          stickerId: another,
          giverId: userId,
          claimCommitment: bytes32(`commitment ${anotherGift}`),
          expiresAt: new Date(Date.now() + GIFT_EXPIRY_MS),
        })
        .run();
    };
    const mint = await sponsored(
      deps,
      { kind: "mint", stickerId: another },
      await chain.sui.mintKind({
        stickerId: another,
        number: 2,
        artist: wallet.toSuiAddress(),
        contentHash: bytes32(another),
        width: 1,
        height: 1,
        nsfw: false,
        image: `${bytes32(another).slice(2)}.png`,
      }),
    );

    await expect(sponsorDeposit({ ...packAnother, alongside })).rejects.toThrow();
    expect(db.select().from(gifts).where(eq(gifts.id, anotherGift)).all()).toEqual([]);

    drop(deps, mint);
    const deposit = await sponsorDeposit({ ...packAnother, alongside });
    expect(deposit.giftId).toBe(anotherGift);
    expect(db.select().from(gifts).where(eq(gifts.id, anotherGift)).all()).toHaveLength(1);
  });
});

describe("runAsServer", () => {
  it("signs as the server, submits with Shinami's signature, and answers what the transaction emitted", async () => {
    const claim = await sponsorClaim();
    const events = [{ type: "0x1::gift::GiftClaimed", bcs: new Uint8Array([1, 2]) }];
    chain.answerNext({ ok: true, events });

    const ran = await runAsServer(deps, claim);
    const serverSignature = await chain.sui.signAsServer(claim.txBytes);
    expect(chain.submissions).toEqual([
      { digest: claim.digest, signatures: [serverSignature, claim.sponsorSignature] },
    ]);
    expect(ran.row).toMatchObject({
      outcome: "succeeded",
      senderSignature: serverSignature,
      submittedAt: clock.now(),
      settledAt: clock.now(),
    });
    expect(ran.events).toEqual(events);
    logs.expectLogged("sui.tx.submitted", { kind: "claim", txDigest: claim.digest, giftId });
    logs.expectLogged("sui.tx.succeeded", { kind: "claim", txDigest: claim.digest, giftId });
  });
});

/** A well-formed zkLogin signature over the row's bytes, which only Sui itself could check. */
async function zkLoginSignatureOf(row: SuiTransaction) {
  const claim = Buffer.from('"iss":"https://accounts.google.com",').toString("base64url");
  return getZkLoginSignature({
    inputs: {
      proofPoints: {
        a: ["1", "2", "1"],
        b: [
          ["1", "2"],
          ["3", "4"],
          ["1", "0"],
        ],
        c: ["1", "2", "1"],
      },
      issBase64Details: { value: claim, indexMod4: 0 },
      headerBase64: "e30",
      addressSeed: "1",
    },
    maxEpoch: 10,
    userSignature: await signatureOf(row),
  });
}

describe("runSigned", () => {
  it("refuses a signature that isn't the sender's wallet's, or can't be checked here, and runs the row on a good one", async () => {
    const deposit = await sponsorDeposit();
    for (const refused of [
      await signatureOf(deposit, Ed25519Keypair.generate()),
      await zkLoginSignatureOf(deposit),
    ]) {
      await expect(runSigned(deps, deposit, refused)).rejects.toBeInstanceOf(SignatureInvalidError);
    }
    expect(stored(deposit)).toMatchObject({ senderSignature: null, submittedAt: null });

    const signature = await signatureOf(deposit);
    const { row } = await runSigned(deps, deposit, signature);
    expect(row).toMatchObject({ outcome: "succeeded", senderSignature: signature });
    expect(chain.submissions).toEqual([
      { digest: deposit.digest, signatures: [signature, deposit.sponsorSignature] },
    ]);
  });

  it("follows a row it already submitted, so a retry after a lost answer never sends it twice", async () => {
    const deposit = await lostDeposit();
    expect(deposit).toMatchObject({ outcome: null, submittedAt: clock.now() });
    chain.show(deposit.digest, { ok: true, events: [] });

    const { row } = await runSigned(deps, deposit, await signatureOf(deposit));
    expect(row.outcome).toBe("succeeded");
    expect(chain.submissions).toHaveLength(1);
  });

  it("submits a row once when two runs of it race", async () => {
    const deposit = await sponsorDeposit();
    const signature = await signatureOf(deposit);
    const runs = await Promise.all([
      runSigned(deps, deposit, signature),
      runSigned(deps, deposit, signature),
    ]);
    expect(runs.map(({ row }) => row.outcome)).toEqual(["succeeded", "succeeded"]);
    expect(chain.submissions).toHaveLength(1);
  });

  it("refuses and drops a row whose sponsorship lapsed, so the flow can sponsor again at once", async () => {
    const deposit = await sponsorDeposit();
    const signature = await signatureOf(deposit);
    clock.set(deposit.expiresAt);

    const { row } = await runSigned(deps, deposit, signature);
    expect(row).toMatchObject({ outcome: "dead", submittedAt: null });
    expect(chain.submissions).toEqual([]);
    logs.expectLogged("sui.tx.dead", { kind: "deposit", txDigest: deposit.digest });
    await expect(sponsorDeposit()).resolves.toMatchObject({ outcome: null });
  });
});

describe("follow", () => {
  it("settles a submitted transaction as Sui shows it ran, in Sui's words when it failed", async () => {
    const deposit = await lostDeposit();
    const failure = "MoveAbort(MoveLocation { module: gift, function: 0 }, 1) in command 0";
    chain.show(deposit.digest, { ok: false, failure });

    const { row } = await follow(deps, deposit);
    expect(row).toMatchObject({ outcome: "failed", failure, settledAt: clock.now() });
    expect(chain.submissions).toHaveLength(1);
    logs.expectLogged("sui.tx.failed", { kind: "deposit", txDigest: deposit.digest, giftId });
  });

  it("submits a transaction Sui doesn't show again, with the same bytes and signatures, before its sponsorship lapses", async () => {
    const deposit = await lostDeposit();
    const { row } = await follow(deps, deposit);
    expect(row.outcome).toBe("succeeded");
    const [first, again] = chain.submissions;
    expect(again).toEqual(first);
  });

  it("leaves a submitted transaction Sui doesn't show open for SETTLE_GRACE_MS past its lapse, then settles it dead", async () => {
    const deposit = await lostDeposit();
    clock.set(deposit.expiresAt);
    expect((await follow(deps, deposit)).row.outcome).toBeNull();

    clock.advance(SETTLE_GRACE_MS);
    expect((await follow(deps, deposit)).row.outcome).toBe("dead");
    expect(chain.submissions).toHaveLength(1);
  });

  it("settles a transaction never submitted dead as soon as its sponsorship lapses", async () => {
    const deposit = await sponsorDeposit();
    clock.set(new Date(deposit.expiresAt.getTime() - 1));
    expect((await follow(deps, deposit)).row.outcome).toBeNull();

    clock.advance(1);
    expect((await follow(deps, deposit)).row.outcome).toBe("dead");
  });
});

describe("what a submission comes back with", () => {
  it("lands the flow's record in the database transaction that settles a success, and a record that throws leaves the row open", async () => {
    const receiver = insertUser(db);
    const claim = await sponsorClaim();
    const events = [{ type: "0x1::gift::GiftClaimed", bcs: new Uint8Array([3]) }];
    chain.answerNext({ ok: true, events });
    const failingRecord = () => {
      throw new Error("The record failed");
    };
    await expect(runAsServer(deps, claim, failingRecord)).rejects.toThrow("The record failed");
    expect(stored(claim)).toMatchObject({ outcome: null, submittedAt: clock.now() });

    const recorded: SuiEvents[] = [];
    const { row } = await follow(deps, claim, (tx, shownEvents) => {
      recorded.push(shownEvents);
      tx.update(stickers).set({ ownerId: receiver }).where(eq(stickers.id, stickerId)).run();
    });
    expect(row.outcome).toBe("succeeded");
    expect(recorded).toEqual([events]);
    const owner = db
      .select({ id: stickers.ownerId })
      .from(stickers)
      .where(eq(stickers.id, stickerId));
    expect(owner.get()).toEqual({ id: receiver });
  });

  it("settles one Sui refuses outright dead at once, in Sui's words, and leaves one Sui couldn't take open", async () => {
    const refused = await sponsorDeposit();
    const words =
      "Transaction is rejected as invalid by more than 1/3 of validators (non-retriable)";
    chain.answerNext(new TransactionRefusedError(words));
    const { row } = await runSigned(deps, refused, await signatureOf(refused));
    expect(row).toMatchObject({ outcome: "dead", failure: words });

    const unreachable = await sponsorDeposit();
    chain.answerNext(new ChainUnavailableError("Sui didn't take the transaction"));
    await expect(
      runSigned(deps, unreachable, await signatureOf(unreachable)),
    ).rejects.toBeInstanceOf(ChainUnavailableError);
    expect(stored(unreachable)).toMatchObject({ outcome: null, submittedAt: clock.now() });
  });
});

describe("drop", () => {
  it("settles a row never submitted dead at once, and throws on a submitted one", async () => {
    const deposit = await sponsorDeposit();
    expect(drop(deps, deposit)).toMatchObject({ outcome: "dead", settledAt: clock.now() });

    const claim = await sponsorClaim();
    chain.answerNext("lost");
    await runAsServer(deps, claim);
    expect(() => drop(deps, claim)).toThrow(/submitted/);
    expect(stored(claim)?.outcome).toBeNull();
  });
});
