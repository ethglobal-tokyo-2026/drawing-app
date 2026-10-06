import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { toBase64 } from "@mysten/sui/utils";
import { expect, it } from "vitest";
import { ChainUnavailableError } from "../deps.ts";
import { TEST_PAYMENT_TARGET } from "../testing/fakes.ts";
import { createSuiChain } from "./suiChain.ts";

it("answers a submission that never reaches Sui as Sui being unavailable, not as a refusal", async () => {
  // Nothing listens on port 1, so the request fails before Sui sees it.
  const sui = createSuiChain({
    client: new SuiGrpcClient({ network: "localnet", baseUrl: "http://127.0.0.1:1" }),
    serverPrivateKey: Ed25519Keypair.generate().getSecretKey(),
    stickerPackage: "0x1",
    stickerRegistry: "0x1",
    serverConfig: "0x1",
    giftEscrow: "0x1",
    payment: TEST_PAYMENT_TARGET,
  });
  await expect(sui.submit(toBase64(new Uint8Array([1])), [])).rejects.toBeInstanceOf(
    ChainUnavailableError,
  );
});
