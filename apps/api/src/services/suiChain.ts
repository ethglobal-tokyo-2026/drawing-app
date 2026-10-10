import { bcs } from "@mysten/sui/bcs";
import { ObjectError, TransactionError, type SuiClientTypes } from "@mysten/sui/client";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";
import {
  deriveObjectID,
  fromBase64,
  fromHex,
  normalizeSuiAddress,
  SUI_CLOCK_OBJECT_ID,
} from "@mysten/sui/utils";
import { ChainUnavailableError, type TicketPaymentTarget } from "../deps.ts";
import { NOT_LANDED_RETRY_MS, readLanded, SUI_READ_TIMEOUT_MS } from "../sui/readLanded.ts";
import {
  SponsorshipError,
  TransactionRefusedError,
  type EscrowGift,
  type GiftObjectStatus,
  type SuiChain,
  type SuiOutcome,
} from "../sui/types.ts";

/** How long one submission may wait for Sui to run the transaction and answer. */
const SUBMIT_TIMEOUT_MS = 30_000;
/**
 * A kind's whole build, the reads it makes included. Packaging and the checkout sponsor the kind
 * next, inside the app's own request limit (REQUEST_TIMEOUT_MS in the frontend's httpApi.ts).
 */
const BUILD_TIMEOUT_MS = 5_000;

/** The package's ServerConfig, field for field. */
const serverConfigObject = bcs.struct("ServerConfig", {
  id: bcs.Address,
  server: bcs.Address,
});

/** The package's Gift, field for field. */
const giftObject = bcs.struct("Gift", {
  id: bcs.Address,
  gift_id: bcs.vector(bcs.u8()),
  sender: bcs.Address,
  sticker: bcs.Address,
  claim_commitment: bcs.vector(bcs.u8()),
  expires_at_ms: bcs.u64(),
  status: bcs.enum("GiftStatus", {
    Pending: null,
    Claimed: null,
    TakenOut: null,
    ExpiredReturned: null,
  }),
  recipient: bcs.option(bcs.Address),
});

/** Sui's Clock, field for field. */
const clockObject = bcs.struct("Clock", { id: bcs.Address, timestamp_ms: bcs.u64() });

const giftStatusOf = {
  Pending: "pending",
  Claimed: "claimed",
  TakenOut: "taken_out",
  ExpiredReturned: "expired_returned",
} as const satisfies Record<string, GiftObjectStatus>;

/** A gRPC call's failure, as @protobuf-ts throws it; read by shape, since its class isn't exported. */
const isRpcError = (error: unknown): error is Error & { code: string } =>
  error instanceof Error &&
  error.name === "RpcError" &&
  "code" in error &&
  typeof error.code === "string";

/**
 * Whether `error` says Sui doesn't show an object: the SDK's ObjectError, or gRPC's NOT_FOUND, which
 * a transaction's build wraps in an Error of its own.
 */
function objectNotFound(error: unknown): boolean {
  if (error instanceof ObjectError) return error.reason === "notFound";
  if (isRpcError(error)) return error.code === "NOT_FOUND";
  return error instanceof Error && error.cause !== undefined && objectNotFound(error.cause);
}

/** A transaction's result, in the words the flows read. */
function outcomeFrom(result: SuiClientTypes.TransactionResult<{ events: true }>): SuiOutcome {
  if (result.$kind === "FailedTransaction") {
    return {
      ok: false,
      failure: result.FailedTransaction.status.error?.message ?? "Sui gave no reason",
    };
  }
  return {
    ok: true,
    events: result.Transaction.events.map((event) => ({ type: event.eventType, bcs: event.bcs })),
  };
}

/** Hex as Move's vector<u8>. */
const bytesOf = (hex: string) => Array.from(fromHex(hex));

export interface SuiChainSettings {
  client: SuiGrpcClient;
  /** `suiprivkey…`, an Ed25519 key: the server's address, which holds no SUI. */
  serverPrivateKey: string;
  /** The package's latest version, which calls go to. */
  stickerPackage: string;
  stickerRegistry: string;
  serverConfig: string;
  giftEscrow: string;
  payment: TicketPaymentTarget;
}

/**
 * Croquis's stickers package on Sui, over gRPC. Builders answer transaction kinds that never use
 * the gas coin, since Shinami attaches its own. Builds give up after BUILD_TIMEOUT_MS and reads
 * after SUI_READ_TIMEOUT_MS, with ChainUnavailableError.
 */
export function createSuiChain(settings: SuiChainSettings): SuiChain {
  const { client, payment } = settings;
  const pkg = normalizeSuiAddress(settings.stickerPackage);
  const registry = normalizeSuiAddress(settings.stickerRegistry);
  const serverConfig = normalizeSuiAddress(settings.serverConfig);
  const escrow = normalizeSuiAddress(settings.giftEscrow);

  const { scheme, secretKey } = decodeSuiPrivateKey(settings.serverPrivateKey);
  if (scheme !== "ED25519") {
    throw new Error(`The server's Sui key must be Ed25519; it's ${scheme}`);
  }
  const serverKey = Ed25519Keypair.fromSecretKey(secretKey);
  const server = serverKey.toSuiAddress();

  /**
   * A package's original ID. Its types, the derivation keys and events among them, keep it across
   * upgrades, while calls go to the latest version. Read from Sui once per package, and again after
   * a read that failed.
   */
  const originalIds = new Map<string, Promise<string>>();
  const originalIdOf = (packageId: string) => {
    const known = originalIds.get(packageId);
    if (known) return known;
    const reading = read(`package ${packageId}`, (signal) =>
      client.movePackageService
        .getPackage({ packageId }, { abort: signal })
        .then(({ response }) => {
          const originalId = response.package?.originalId;
          if (!originalId) throw new Error(`Sui shows no original ID for package ${packageId}`);
          return normalizeSuiAddress(originalId);
        }),
    );
    originalIds.set(packageId, reading);
    reading.catch(() => {
      if (originalIds.get(packageId) === reading) originalIds.delete(packageId);
    });
    return reading;
  };
  const typeOrigin = () => originalIdOf(pkg);
  const paymentPackage = normalizeSuiAddress(payment.paymentPackage);

  const giftObjectId = async (giftId: string) =>
    deriveObjectID(
      escrow,
      `${await typeOrigin()}::gift::GiftKey`,
      bcs.vector(bcs.u8()).serialize(bytesOf(giftId)).toBytes(),
    );

  const stickerObjectId = async (stickerId: string) =>
    deriveObjectID(
      registry,
      `${await typeOrigin()}::sticker::StickerKey`,
      bcs.string().serialize(stickerId).toBytes(),
    );

  /**
   * Builds the transaction `compose` answers as a kind, reading the objects it names from Sui;
   * `compose` makes its own reads with `signal`. All of it gives up after BUILD_TIMEOUT_MS.
   */
  async function kindOf(
    what: string,
    compose: (signal: AbortSignal) => Transaction | Promise<Transaction>,
  ): Promise<Uint8Array> {
    const late = new AbortController();
    const timer = setTimeout(
      () => late.abort(new ChainUnavailableError(`Sui didn't answer in time to build ${what}`)),
      BUILD_TIMEOUT_MS,
    );
    const deadline = new Promise<never>((_, reject) => {
      late.signal.addEventListener("abort", () => reject(late.signal.reason), { once: true });
    });
    try {
      for (;;) {
        try {
          const built = Promise.resolve(compose(late.signal)).then((tx) =>
            tx.build({ client, onlyTransactionKind: true }),
          );
          return await Promise.race([built, deadline]);
        } catch (error) {
          if (!objectNotFound(error)) throw error;
          // The public fullnode is load-balanced: the node answering can lag the one that ran the
          // transaction that made the object, such as a gift's deposit just before its claim.
          await Promise.race([
            new Promise((resolve) => setTimeout(resolve, NOT_LANDED_RETRY_MS)),
            deadline,
          ]);
        }
      }
    } catch (error) {
      if (isRpcError(error) || objectNotFound(error)) {
        throw new ChainUnavailableError(`Sui couldn't be read to build ${what}`, { cause: error });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Runs a read, answering ChainUnavailableError when Sui can't be asked. */
  async function read<T>(what: string, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    try {
      return await run(AbortSignal.timeout(SUI_READ_TIMEOUT_MS));
    } catch (error) {
      if (error instanceof ChainUnavailableError) throw error;
      throw new ChainUnavailableError(`Sui couldn't be asked for ${what}`, { cause: error });
    }
  }

  return {
    server,

    mintKind: (mint) =>
      kindOf(`the mint of sticker ${mint.stickerId}`, () => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${pkg}::sticker::mint`,
          arguments: [
            tx.object(serverConfig),
            tx.object(registry),
            tx.pure.string(mint.stickerId),
            tx.pure.u64(mint.number),
            tx.pure.address(mint.artist),
            tx.pure.vector("u8", bytesOf(mint.contentHash)),
            tx.pure.u32(mint.width),
            tx.pure.u32(mint.height),
            tx.pure.bool(mint.nsfw),
            tx.pure.string(mint.image),
          ],
        });
        return tx;
      }),

    depositKind: (deposit) =>
      kindOf(`the deposit of gift ${deposit.giftId}`, () => {
        const tx = new Transaction();
        tx.setSender(deposit.sender);
        tx.moveCall({
          target: `${pkg}::gift::deposit`,
          arguments: [
            tx.object(escrow),
            tx.object(deposit.stickerObjectId),
            tx.pure.vector("u8", bytesOf(deposit.giftId)),
            tx.pure.vector("u8", bytesOf(deposit.claimCommitment)),
            tx.pure.u64(deposit.expiresAt.getTime()),
            tx.object.clock(),
          ],
        });
        return tx;
      }),

    takeOutKind: (sender, giftId) =>
      kindOf(`the take-out of gift ${giftId}`, async () => {
        const tx = new Transaction();
        tx.setSender(sender);
        tx.moveCall({
          target: `${pkg}::gift::take_out`,
          arguments: [tx.object(await giftObjectId(giftId))],
        });
        return tx;
      }),

    claimKind: (giftId, recipient) =>
      kindOf(`the claim of gift ${giftId}`, async () => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${pkg}::gift::claim`,
          arguments: [
            tx.object(serverConfig),
            tx.object(await giftObjectId(giftId)),
            tx.pure.address(recipient),
            tx.object.clock(),
          ],
        });
        return tx;
      }),

    returnKind: (giftId) =>
      kindOf(`the return of gift ${giftId}`, async () => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${pkg}::gift::return_expired`,
          arguments: [
            tx.object(serverConfig),
            tx.object(await giftObjectId(giftId)),
            tx.object.clock(),
          ],
        });
        return tx;
      }),

    paymentKind: ({ sender, amount, reference }) =>
      kindOf(`the payment ${reference}`, async (signal) => {
        const { balance } = await client.getBalance({
          owner: sender,
          coinType: payment.coinType,
          signal,
        });
        // What Shinami's dry run would refuse, in words the person can act on.
        if (BigInt(balance.balance) < amount) {
          throw new SponsorshipError(
            "refused",
            `The payer holds ${balance.balance} JPYC base units, short of the ${amount} the pack costs`,
          );
        }
        const tx = new Transaction();
        tx.setSender(sender);
        // JPYC's coins and address balance, never the gas coin.
        const coin = tx.add(coinWithBalance({ type: payment.coinType, balance: amount }));
        tx.moveCall({
          target: `${payment.paymentPackage}::payment::pay`,
          arguments: [
            tx.object(payment.vault),
            coin,
            tx.pure.u64(amount),
            tx.pure.vector("u8", Array.from(new TextEncoder().encode(reference))),
          ],
        });
        // `pay` takes the whole amount, so the coin is left empty, and a coin can't be dropped.
        tx.moveCall({
          target: "0x2::coin::destroy_zero",
          typeArguments: [payment.coinType],
          arguments: [coin],
        });
        return tx;
      }),

    signAsServer: async (txBytes) =>
      (await serverKey.signTransaction(fromBase64(txBytes))).signature,

    submit: async (txBytes, signatures) => {
      try {
        const result = await client.executeTransaction({
          transaction: fromBase64(txBytes),
          signatures,
          include: { events: true },
          signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
        });
        return outcomeFrom(result);
      } catch (error) {
        if (!isRpcError(error)) throw error;
        // Cut off while Sui may have been running it: only reading it back can tell.
        if (error.code === "DEADLINE_EXCEEDED" || error.code === "CANCELLED") return null;
        // Sui's verdict on the transaction itself, such as an input already used or a signature
        // that isn't its signer's: sending the same bytes again gets the same answer.
        if (error.code === "INVALID_ARGUMENT") {
          throw new TransactionRefusedError(error.message, { cause: error });
        }
        // Sui unavailable or rate limiting, or the request never reaching it, which the client
        // reports as INTERNAL.
        throw new ChainUnavailableError("Sui didn't take the transaction", { cause: error });
      }
    },

    outcomeOf: async (digest) => {
      const result = await read(`transaction ${digest}`, () =>
        readLanded((signal) =>
          client
            .getTransaction({ digest, include: { events: true }, signal })
            .catch((error: unknown) => {
              if (error instanceof TransactionError && error.reason === "notFound") return null;
              throw error;
            }),
        ),
      );
      return result === null ? null : outcomeFrom(result);
    },

    stickerObjectId,

    paymentOriginalPackage: () => originalIdOf(paymentPackage),

    stickerMinted: async (stickerId) => {
      const objectId = await stickerObjectId(stickerId);
      const object = await read(`sticker ${stickerId}'s object`, (signal) =>
        client
          .getObject({ objectId, signal })
          .then(({ object }) => object)
          .catch((error: unknown) => {
            if (objectNotFound(error)) return null;
            throw error;
          }),
      );
      return object !== null;
    },

    readGift: async (giftId): Promise<EscrowGift> => {
      const objectId = await giftObjectId(giftId);
      // A gift deposited a moment ago can be missing from a lagging node, so missing waits out readLanded.
      const object = await read(`gift ${giftId}`, () =>
        readLanded((signal) =>
          client
            .getObject({ objectId, include: { content: true }, signal })
            .then(({ object }) => object)
            .catch((error: unknown) => {
              if (objectNotFound(error)) return null;
              throw error;
            }),
        ),
      );
      if (object === null) return { status: "missing", recipient: null };
      const gift = giftObject.parse(object.content);
      return {
        status: giftStatusOf[gift.status.$kind],
        recipient: gift.recipient === null ? null : normalizeSuiAddress(gift.recipient),
      };
    },

    readClock: () =>
      read("the Clock", (signal) =>
        client
          .getObject({ objectId: SUI_CLOCK_OBJECT_ID, include: { content: true }, signal })
          .then(({ object }) => new Date(Number(clockObject.parse(object.content).timestamp_ms))),
      ),

    check: async () => {
      const named = {
        SUI_STICKER_PACKAGE: pkg,
        SUI_STICKER_REGISTRY: registry,
        SUI_SERVER_CONFIG: serverConfig,
        SUI_GIFT_ESCROW: escrow,
        JPYC_PAYMENT_PACKAGE: payment.paymentPackage,
        JPYC_PAYMENT_VAULT: payment.vault,
      };
      const { objects } = await read("the configured objects", (signal) =>
        client.getObjects({ objectIds: Object.values(named), signal }),
      );
      const missing: string[] = [];
      for (const [index, name] of Object.keys(named).entries()) {
        const object = objects[index];
        if (!(object instanceof Error)) continue;
        if (!objectNotFound(object)) {
          throw new ChainUnavailableError(`Sui couldn't be asked for ${name}`, { cause: object });
        }
        missing.push(name);
      }
      // Read now, so the first gift, mint or ticket shop after boot doesn't wait on them.
      if (!missing.includes("SUI_STICKER_PACKAGE")) await typeOrigin();
      if (!missing.includes("JPYC_PAYMENT_PACKAGE")) await originalIdOf(paymentPackage);
      if (missing.includes("SUI_SERVER_CONFIG")) return { serverMatches: false, missing };
      const config = await read("ServerConfig", (signal) =>
        client.getObject({ objectId: serverConfig, include: { content: true }, signal }),
      );
      const configured = normalizeSuiAddress(
        serverConfigObject.parse(config.object.content).server,
      );
      return { serverMatches: configured === server, missing };
    },
  };
}
