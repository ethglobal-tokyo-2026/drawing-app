import { createServer } from "node:http";
import { bcs } from "@mysten/sui/bcs";
import { GrpcTypes, SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { deriveObjectID, toBase64 } from "@mysten/sui/utils";
import { expect, it } from "vitest";
import { ChainUnavailableError } from "../deps.ts";
import { TEST_PAYMENT_TARGET } from "../testing/fakes.ts";
import { createSuiChain } from "./suiChain.ts";

const REGISTRY = `0x${"4".repeat(64)}`;

/** The chain over `client`, with made-up objects. */
const suiChainOn = (client: SuiGrpcClient, stickerPackage = "0x1") =>
  createSuiChain({
    client,
    serverPrivateKey: Ed25519Keypair.generate().getSecretKey(),
    stickerPackage,
    stickerRegistry: REGISTRY,
    serverConfig: "0x1",
    giftEscrow: "0x1",
    payment: TEST_PAYMENT_TARGET,
  });

/** A gRPC-web frame: its flag, its length and its bytes. */
function frame(flag: number, payload: Uint8Array) {
  const header = Buffer.alloc(5);
  header.writeUInt8(flag, 0);
  header.writeUInt32BE(payload.length, 1);
  return Buffer.concat([header, payload]);
}

/**
 * A fullnode on this machine that answers only GetPackage, showing `originalId` for any package, as
 * Sui does for an upgraded one. Counts the requests it answers.
 */
async function fullnodeShowingOriginal(originalId: string) {
  let requests = 0;
  const server = createServer((request, response) => {
    request.resume();
    if (!request.url?.endsWith("/sui.rpc.v2.MovePackageService/GetPackage")) {
      response.writeHead(404).end();
      return;
    }
    requests += 1;
    const answer = GrpcTypes.GetPackageResponse.toBinary(
      GrpcTypes.GetPackageResponse.create({ package: GrpcTypes.Package.create({ originalId }) }),
    );
    response.writeHead(200, { "Content-Type": "application/grpc-web+proto" });
    response.end(Buffer.concat([frame(0, answer), frame(0x80, Buffer.from("grpc-status:0\r\n"))]));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("The fullnode has no port");
  return {
    client: new SuiGrpcClient({ network: "localnet", baseUrl: `http://127.0.0.1:${address.port}` }),
    requests: () => requests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

it("answers a submission that never reaches Sui as Sui being unavailable, not as a refusal", async () => {
  // Nothing listens on port 1, so the request fails before Sui sees it.
  const sui = suiChainOn(new SuiGrpcClient({ network: "localnet", baseUrl: "http://127.0.0.1:1" }));
  await expect(sui.submit(toBase64(new Uint8Array([1])), [])).rejects.toBeInstanceOf(
    ChainUnavailableError,
  );
});

it("derives a sticker's object ID and names the payment package by each package's original ID, which its types keep after an upgrade", async () => {
  const original = `0x${"0a".repeat(32)}`;
  const latest = `0x${"0b".repeat(32)}`;
  const fullnode = await fullnodeShowingOriginal(original);
  try {
    const sui = suiChainOn(fullnode.client, latest);
    const key = bcs.string().serialize("sticker-1").toBytes();
    const objectId = await sui.stickerObjectId("sticker-1");
    expect(objectId).toBe(deriveObjectID(REGISTRY, `${original}::sticker::StickerKey`, key));
    expect(objectId).not.toBe(deriveObjectID(REGISTRY, `${latest}::sticker::StickerKey`, key));
    await sui.stickerObjectId("sticker-2");
    expect(fullnode.requests()).toBe(1);
    // The payment package is read once too, its events keeping its original ID.
    await expect(sui.paymentOriginalPackage()).resolves.toBe(original);
    await sui.paymentOriginalPackage();
    expect(fullnode.requests()).toBe(2);
  } finally {
    await fullnode.close();
  }
});
