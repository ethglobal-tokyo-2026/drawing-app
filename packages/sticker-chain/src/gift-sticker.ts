import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  bytesToHex,
  encodeAbiParameters,
  encodeFunctionData,
  isAddress,
  isHex,
  keccak256,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import type { PrivateKeyAccount } from "viem/accounts";

const stickerTransferAbi = parseAbi([
  "function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)",
]);

export const stickerGiftEscrowAbi = parseAbi([
  "function claimGift(bytes32 giftId, address recipient, uint256 authorizationDeadline, bytes authorization)",
  "function rejectGift(bytes32 giftId, uint256 authorizationDeadline, bytes authorization)",
]);

interface PendingGiftRecord {
  giftId: Hex;
  claimCommitment: Hex;
  expiresAt: number;
  status: "pending" | "claimed" | "rejected" | "expired_returned";
}

interface SmartWalletRecord {
  address: Address;
  kind: "smart_account" | "signer_eoa";
  chainId: number;
}

function requireBytes32(value: string, field: string): asserts value is Hex {
  if (!isHex(value) || value.length !== 66) throw new Error(`${field} must be 32 bytes`);
}

function claimTokenMatches(token: Hex, commitment: Hex) {
  requireBytes32(token, "Claim token");
  requireBytes32(commitment, "Claim commitment");
  return timingSafeEqual(
    Buffer.from(keccak256(token).slice(2), "hex"),
    Buffer.from(commitment.slice(2), "hex"),
  );
}

export function createGiftClaim(
  randomBytesImpl: (size: number) => Uint8Array = randomBytes,
) {
  const giftId = bytesToHex(randomBytesImpl(32));
  const claimToken = bytesToHex(randomBytesImpl(32));
  requireBytes32(giftId, "Gift ID");
  requireBytes32(claimToken, "Claim token");
  return { giftId, claimToken, claimCommitment: keccak256(claimToken) };
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
  requireBytes32(giftId, "Gift ID");
  requireBytes32(claimCommitment, "Claim commitment");
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
      abi: stickerTransferAbi,
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
  signer: PrivateKeyAccount;
  chainId: number;
  escrowContract: Address;
  findGift: (giftId: Hex) => Promise<PendingGiftRecord | null>;
  findArtistSmartWallet: (artistId: string) => Promise<SmartWalletRecord | null>;
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

  async function requirePendingGift(giftId: Hex, claimToken: Hex) {
    requireBytes32(giftId, "Gift ID");
    const gift = await findGift(giftId);
    if (!gift || gift.giftId !== giftId || gift.status !== "pending") {
      throw new Error("Gift is not pending");
    }
    if (gift.expiresAt <= now()) throw new Error("Gift has expired");
    if (!claimTokenMatches(claimToken, gift.claimCommitment)) {
      throw new Error("Gift claim token is invalid");
    }
    return gift;
  }

  return {
    async authorizeClaim({
      giftId,
      claimToken,
      recipientArtistId,
    }: {
      giftId: Hex;
      claimToken: Hex;
      recipientArtistId: string;
    }) {
      const gift = await requirePendingGift(giftId, claimToken);
      if (!recipientArtistId) throw new Error("Recipient artist is required");
      const recipientWallet = await findArtistSmartWallet(recipientArtistId);
      if (
        recipientWallet?.kind !== "smart_account" || recipientWallet.chainId !== chainId ||
        !isAddress(recipientWallet.address)
      ) {
        throw new Error("Recipient World Chain smart wallet is unavailable");
      }
      const authorizationDeadline = Math.min(gift.expiresAt, now() + 300);
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
          recipient: recipientWallet.address,
          authorizationDeadline: BigInt(authorizationDeadline),
        },
      });
      return { authorization, authorizationDeadline, recipient: recipientWallet.address };
    },

    async authorizeRejection({ giftId, claimToken }: { giftId: Hex; claimToken: Hex }) {
      const gift = await requirePendingGift(giftId, claimToken);
      const authorizationDeadline = Math.min(gift.expiresAt, now() + 300);
      const authorization = await signer.signTypedData({
        domain,
        primaryType: "GiftReject",
        types: {
          GiftReject: [
            { name: "giftId", type: "bytes32" },
            { name: "authorizationDeadline", type: "uint256" },
          ],
        },
        message: { giftId, authorizationDeadline: BigInt(authorizationDeadline) },
      });
      return { authorization, authorizationDeadline };
    },
  };
}
