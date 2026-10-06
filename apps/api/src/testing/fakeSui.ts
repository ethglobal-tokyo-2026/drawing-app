import { bytes32 } from "@drawing-app/db/testing";
import { TransactionDataBuilder } from "@mysten/sui/transactions";
import { fromBase64, toBase64 } from "@mysten/sui/utils";
import type { Clock } from "../deps.ts";
import type {
  EscrowGift,
  GasStation,
  MintRequest,
  Sponsorship,
  SuiChain,
  SuiOutcome,
} from "../sui/types.ts";
import { paymentReceivedEvent, stickerSealedEvent } from "../sui/events.ts";
import { TEST_PAYMENT_TARGET } from "./fakes.ts";

/** How long a sponsorship lasts, as Shinami's do. */
const SPONSORSHIP_MS = 60 * 60_000;
/** The stickers package the fake chain's events come from. */
const PACKAGE = `0x${"5c".repeat(32)}`;

/** What one of the fake chain's builders was asked for, by the kind of transaction it builds. */
export type BuiltKind =
  | { kind: "mint"; mint: MintRequest }
  | { kind: "deposit"; deposit: Parameters<SuiChain["depositKind"]>[0] }
  | { kind: "take_out"; sender: string; giftId: string }
  | { kind: "claim"; giftId: string; recipient: string }
  | { kind: "return"; giftId: string }
  | { kind: "payment"; payment: Parameters<SuiChain["paymentKind"]>[0] };

/**
 * What Sui does with a submission: runs it to an outcome, runs it or not with the answer lost on
 * the way back, or can't be reached.
 */
export type SubmissionAnswer = SuiOutcome | "lost" | Error;

const utf8 = (text: string) => new TextEncoder().encode(text);

/**
 * Sui and Shinami Gas Station without either. Builders record what they're asked for, and each
 * sponsorship lasts an hour by `clock`. A submission runs at once and succeeds, unless the test
 * answers it otherwise first, and a transaction that succeeds moves its gift in `escrow` as the
 * package does.
 */
export function fakeSui(clock: Clock) {
  const built: BuiltKind[] = [];
  const sponsorships: { built: BuiltKind; sender: string; sponsorship: Sponsorship }[] = [];
  const submissions: { digest: string; signatures: string[] }[] = [];
  /** Each gift's object, by gift id; a gift not here reads as missing. */
  const escrow = new Map<string, EscrowGift>();
  const shown = new Map<string, SuiOutcome>();
  const builtByDigest = new Map<string, BuiltKind>();
  const senders = new Map<string, string>();
  const refusals: Error[] = [];
  const answers: SubmissionAnswer[] = [];
  /** Stickers whose object exists, by sticker id. */
  const minted = new Set<string>();

  /** Records what was asked for, and answers a kind that names it. */
  const build = (asked: BuiltKind) => {
    built.push(asked);
    return Promise.resolve(utf8(`kind ${built.length - 1}`));
  };

  /** What a kind the fake chain answered was built from. */
  const builtFrom = (kind: Uint8Array) => {
    const index = /^kind (\d+)$/.exec(new TextDecoder().decode(kind))?.[1];
    const asked = index === undefined ? undefined : built[Number(index)];
    if (!asked) throw new Error("The fake gas station can only sponsor kinds the fake chain built");
    return asked;
  };

  /** Sui ran the transaction: it shows `outcome` from now on, and a success moves its gift. */
  const ran = (digest: string, outcome: SuiOutcome) => {
    shown.set(digest, outcome);
    const asked = builtByDigest.get(digest);
    if (!outcome.ok || !asked) return;
    switch (asked.kind) {
      case "deposit":
        escrow.set(asked.deposit.giftId, { status: "pending", recipient: null });
        break;
      case "claim":
        escrow.set(asked.giftId, { status: "claimed", recipient: asked.recipient });
        break;
      case "take_out":
        escrow.set(asked.giftId, { status: "taken_out", recipient: null });
        break;
      case "return":
        escrow.set(asked.giftId, { status: "expired_returned", recipient: null });
        break;
      case "mint":
        minted.add(asked.mint.stickerId);
        break;
      case "payment":
        break;
    }
  };

  /** What a success of `asked` emits, as the packages' functions do. */
  const eventsOf = (asked: BuiltKind | undefined, sender: string) => {
    if (asked?.kind === "mint") {
      const { stickerId, number, artist, nsfw } = asked.mint;
      const event = {
        sticker: sui.stickerObjectId(stickerId),
        key: stickerId,
        number,
        artist,
        nsfw,
      };
      return [
        {
          type: `${PACKAGE}::sticker::StickerSealed`,
          bcs: stickerSealedEvent.serialize(event).toBytes(),
        },
      ];
    }
    if (asked?.kind === "payment") {
      const { amount, reference } = asked.payment;
      const event = {
        vault_id: TEST_PAYMENT_TARGET.vault,
        payer: sender,
        amount,
        reference: [...utf8(reference)],
      };
      const type = `${TEST_PAYMENT_TARGET.paymentPackage}::payment::PaymentReceived`;
      return [{ type, bcs: paymentReceivedEvent.serialize(event).toBytes() }];
    }
    return [];
  };

  const digestOf = (txBytes: string) =>
    TransactionDataBuilder.getDigestFromBytes(fromBase64(txBytes));

  const sui: SuiChain = {
    server: `0x${"5e".repeat(32)}`,
    payment: TEST_PAYMENT_TARGET,
    mintKind: (mint) => build({ kind: "mint", mint }),
    depositKind: (deposit) => build({ kind: "deposit", deposit }),
    takeOutKind: (sender, giftId) => build({ kind: "take_out", sender, giftId }),
    claimKind: (giftId, recipient) => build({ kind: "claim", giftId, recipient }),
    returnKind: (giftId) => build({ kind: "return", giftId }),
    paymentKind: (payment) => build({ kind: "payment", payment }),
    signAsServer: (txBytes) =>
      Promise.resolve(toBase64(utf8(`the server's signature over ${digestOf(txBytes)}`))),
    submit: (txBytes, signatures) => {
      const digest = digestOf(txBytes);
      submissions.push({ digest, signatures });
      const answer = answers.shift() ?? {
        ok: true,
        events: eventsOf(builtByDigest.get(digest), senders.get(digest) ?? ""),
      };
      if (answer instanceof Error) return Promise.reject(answer);
      if (answer === "lost") return Promise.resolve(null);
      ran(digest, answer);
      return Promise.resolve(answer);
    },
    outcomeOf: (digest) => Promise.resolve(shown.get(digest) ?? null),
    stickerObjectId: (stickerId) => bytes32(`sticker object ${stickerId}`),
    stickerMinted: (stickerId) => Promise.resolve(minted.has(stickerId)),
    readGift: (giftId) =>
      Promise.resolve(escrow.get(giftId) ?? { status: "missing", recipient: null }),
    check: () => Promise.resolve({ serverMatches: true, missing: [] }),
  };

  const gasStation: GasStation = {
    sponsor: (kind, sender) => {
      const refusal = refusals.shift();
      if (refusal) return Promise.reject(refusal);
      const asked = builtFrom(kind);
      // Numbered, so sponsoring one kind twice gives two transactions, as Shinami's gas coins do.
      const txBytes = utf8(
        `${new TextDecoder().decode(kind)} sent by ${sender}, sponsorship ${sponsorships.length}`,
      );
      const digest = TransactionDataBuilder.getDigestFromBytes(txBytes);
      const sponsorship: Sponsorship = {
        digest,
        txBytes: toBase64(txBytes),
        sponsorSignature: toBase64(utf8(`Shinami's signature over ${digest}`)),
        expiresAt: new Date(clock.now().getTime() + SPONSORSHIP_MS),
      };
      builtByDigest.set(digest, asked);
      senders.set(digest, sender);
      sponsorships.push({ built: asked, sender, sponsorship });
      return Promise.resolve(sponsorship);
    },
    available: () => Promise.resolve(5_000_000_000n),
  };

  return {
    sui,
    gasStation,
    /** Every kind a builder was asked for, in order. */
    built,
    /** Every sponsorship Shinami gave, in order. */
    sponsorships,
    /** Every transaction submitted to Sui, with the signatures it carried, in order. */
    submissions,
    escrow,
    /** Stickers whose object exists on the fake chain. */
    minted,
    /** What a success of the transaction `digest` emits, as the fake chain answers it by default. */
    eventsFor: (digest: string) => eventsOf(builtByDigest.get(digest), senders.get(digest) ?? ""),
    /** Shinami refuses the next sponsorship with `error`, such as a SponsorshipError. */
    refuseNext: (error: Error) => {
      refusals.push(error);
    },
    /** What Sui does with the next submission, in place of running it to success. */
    answerNext: (answer: SubmissionAnswer) => {
      answers.push(answer);
    },
    /** Sui ran the transaction `digest` to `outcome`, as it shows from now on. */
    show: ran,
  };
}

export type FakeSui = ReturnType<typeof fakeSui>;
