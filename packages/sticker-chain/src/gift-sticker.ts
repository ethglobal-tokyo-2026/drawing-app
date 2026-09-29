import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  bytesToHex,
  encodeAbiParameters,
  encodeFunctionData,
  isAddress,
  keccak256,
  type Address,
  type Hex,
} from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import { bytes32 } from "@drawing-app/sticker-chain/bytes32";
import { stickerNftAbi } from "@drawing-app/sticker-chain/contracts";

/** How long a claim authorization stays valid, unless the gift expires first. */
const CLAIM_AUTHORIZATION_WINDOW_S = 300;

interface PendingGiftRecord {
  giftId: Hex;
  claimCommitment: Hex;
  expiresAt: number;
  status: "pending" | "claimed" | "rejected" | "expired_returned";
}

export function giftClaimTokenMatches(giftClaimToken: Hex, commitment: Hex) {
  bytes32(giftClaimToken, "Gift claim token");
  bytes32(commitment, "Claim commitment");
  return timingSafeEqual(
    Buffer.from(keccak256(giftClaimToken).slice(2), "hex"),
    Buffer.from(commitment.slice(2), "hex"),
  );
}

export function createGiftClaim(randomBytesImpl: (size: number) => Uint8Array = randomBytes) {
  const giftId = bytes32(bytesToHex(randomBytesImpl(32)), "Gift ID");
  const giftClaimToken = bytes32(bytesToHex(randomBytesImpl(32)), "Gift claim token");
  return { giftId, giftClaimToken, claimCommitment: keccak256(giftClaimToken) };
}

export function prepareGiftTransfer({
  sender,
  stickerContract,
  escrowContract,
  tokenId,
  giftId,
  claimCommitment,
  expiresAt,
  now = () => Math.floor(Date.now() / 1000),
}: {
  sender: Address;
  stickerContract: Address;
  escrowContract: Address;
  tokenId: bigint;
  giftId: Hex;
  claimCommitment: Hex;
  expiresAt: number;
  now?: () => number;
}) {
  if (!isAddress(sender) || !isAddress(stickerContract) || !isAddress(escrowContract)) {
    throw new Error("Gift transfer contains an invalid address");
  }
  bytes32(giftId, "Gift ID");
  bytes32(claimCommitment, "Claim commitment");
  if (tokenId <= 0n || !Number.isSafeInteger(expiresAt) || expiresAt <= now()) {
    throw new Error("Gift transfer contains invalid token or expiration data");
  }
  const stageData = encodeAbiParameters(
    [{ type: "bytes32" }, { type: "bytes32" }, { type: "uint64" }],
    [giftId, claimCommitment, BigInt(expiresAt)],
  );
  return {
    to: stickerContract,
    data: encodeFunctionData({
      abi: stickerNftAbi,
      functionName: "safeTransferFrom",
      args: [sender, escrowContract, tokenId, stageData],
    }),
  };
}

export function createGiftAuthorizer({
  signer,
  chainId,
  escrowContract,
  findGift,
  findArtistSmartWallet,
  now = () => Math.floor(Date.now() / 1000),
}: {
  signer: Pick<PrivateKeyAccount, "signTypedData">;
  chainId: number;
  escrowContract: Address;
  findGift: (giftId: Hex) => Promise<PendingGiftRecord | null>;
  /** The person's smart wallet on `chainId`; null while they have none. */
  findArtistSmartWallet: (artistId: string) => Promise<Address | null>;
  now?: () => number;
}) {
  if (!isAddress(escrowContract) || !Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error("Gift authorizer configuration is invalid");
  }
  const domain = {
    name: "StickerGiftEscrow",
    version: "1",
    chainId,
    verifyingContract: escrowContract,
  } as const;

  /** A pending, unexpired gift; with a Gift Claim Token, only the gift that token opens. */
  async function requirePendingGift(giftId: Hex, giftClaimToken: Hex | null) {
    bytes32(giftId, "Gift ID");
    const gift = await findGift(giftId);
    if (!gift || gift.giftId !== giftId || gift.status !== "pending") {
      throw new Error("Gift is not pending");
    }
    if (gift.expiresAt <= now()) throw new Error("Gift has expired");
    if (giftClaimToken !== null && !giftClaimTokenMatches(giftClaimToken, gift.claimCommitment)) {
      throw new Error("Gift claim token is invalid");
    }
    return gift;
  }

  /** Signs a claim of a pending gift for the recipient's smart wallet. */
  async function signClaim(gift: PendingGiftRecord, giftId: Hex, recipientArtistId: string) {
    if (!recipientArtistId) throw new Error("Recipient artist is required");
    const recipient = await findArtistSmartWallet(recipientArtistId);
    if (!recipient) {
      throw new Error("Recipient Ethereum smart wallet is unavailable on the configured chain");
    }
    const authorizationDeadline = Math.min(gift.expiresAt, now() + CLAIM_AUTHORIZATION_WINDOW_S);
    const authorization = await signer.signTypedData({
      domain,
      primaryType: "GiftClaim",
      types: {
        GiftClaim: [
          { name: "giftId", type: "bytes32" },
          { name: "recipient", type: "address" },
          { name: "authorizationDeadline", type: "uint256" },
        ],
      },
      message: {
        giftId,
        recipient,
        authorizationDeadline: BigInt(authorizationDeadline),
      },
    });
    return { authorization, authorizationDeadline, recipient };
  }

  return {
    async authorizeClaim({
      giftId,
      giftClaimToken,
      recipientArtistId,
    }: {
      giftId: Hex;
      giftClaimToken: Hex;
      recipientArtistId: string;
    }) {
      return signClaim(await requirePendingGift(giftId, giftClaimToken), giftId, recipientArtistId);
    },

    /**
     * Signs a claim without the Gift Claim Token, for the person the API says the gift waits for.
     * A stopgap: the token's holder is no longer the only one who can receive, so it stands only
     * until smart account permissions can authorize that person on chain.
     */
    async authorizeClaimForNamedRecipient({
      giftId,
      recipientArtistId,
    }: {
      giftId: Hex;
      recipientArtistId: string;
    }) {
      return signClaim(await requirePendingGift(giftId, null), giftId, recipientArtistId);
    },
  };
}
