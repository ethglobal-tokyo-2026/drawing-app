import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { stickers, users } from "@drawing-app/db";
import { stickerNftAbi } from "@drawing-app/sticker-chain/contracts";
import { privySubject } from "@drawing-app/sticker-chain/line-privy-jwt";
import { eq } from "drizzle-orm";
import {
  createPublicClient,
  createWalletClient,
  getContractAddress,
  http,
  isHex,
  toHex,
  zeroAddress,
} from "viem";
import { sepolia } from "viem/chains";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  anvilPollingInterval,
  readFoundryArtifact,
  startAnvil,
} from "../../../../packages/sticker-chain/test/helpers/foundry.ts";
import { createServer } from "../app.ts";
import { devIdToken } from "../services/devSignIn.ts";
import { createDiskImageStore } from "../services/imageStore.ts";
import { createPrivySmartWallets } from "../services/privySmartWallets.ts";
import { createStickerChain } from "../services/stickerChain.ts";
import { meSchema, stickerPngsSchema } from "../shapes.ts";
import { sealResponseSchema } from "../stickers/seal.ts";
import { pngFile, sealFormData, sealParts } from "../stickers/testPngs.ts";
import { createTestApp } from "../testing/createTestApp.ts";
import { privySmartWallet, privyUser } from "../testing/privy.ts";
import { bodyOf } from "../testing/responses.ts";
import { ticketUseSchema } from "../tickets/tickets.ts";

const chainRoot = fileURLToPath(new URL("../../../../packages/sticker-chain", import.meta.url));
const lineChannelId = "test-line-channel";
const alice = { sub: "line-alice", name: "Alice" };
// A complete PNG, so the public image can be decoded as well as checked by sealing.
const png = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
    "base64",
  ),
);

beforeAll(async () => {
  await promisify(execFile)("forge", ["build"], { cwd: chainRoot, timeout: 60_000 });
}, 65_000);

describe("Sealing through the REST API and NFT contract", () => {
  it("mints for the signed-in artist, serves immutable assets, and recovers a mint after losing its database result", async () => {
    const anvil = await startAnvil(sepolia.id);
    const imageDir = await mkdtemp(join(tmpdir(), "sticker-sealing-chain-"));
    const test = await createTestApp();
    try {
      const [sealer] = anvil.accounts;
      if (!sealer) throw new Error("Anvil did not provide a sealer");
      const privateKey = sealer.getHdKey().privateKey;
      if (!privateKey) throw new Error("Anvil sealer has no private key");
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(anvil.rpcUrl),
        pollingInterval: anvilPollingInterval,
      });
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: http(anvil.rpcUrl),
        account: sealer,
      });
      const artifact = readFoundryArtifact("StickerNFT", "StickerNFT");
      const deployment = await publicClient.waitForTransactionReceipt({
        hash: await walletClient.deployContract({
          abi: artifact.abi,
          bytecode: artifact.bytecode,
          args: [sealer.address],
        }),
      });
      const contractAddress = deployment.contractAddress;
      if (!contractAddress) throw new Error("StickerNFT deployment returned no address");
      // A new smart account can receive an NFT before its first transaction deploys its code.
      const artistAddress = getContractAddress({ from: sealer.address, nonce: 100n });
      const privyLookup = vi.fn<typeof fetch>(async () =>
        Response.json(privyUser([privySmartWallet(artistAddress)])),
      );
      const smartWallets = createPrivySmartWallets({
        db: test.db,
        lineChannelId,
        privyAppId: "test-app",
        privyAppSecret: "test-secret",
        fetchImpl: privyLookup,
      });
      const images = createDiskImageStore(imageDir, "http://localhost/api/images");
      const chain = createStickerChain({
        rpcUrl: anvil.rpcUrl,
        stickerContract: contractAddress,
        escrowContract: zeroAddress,
        namesContract: zeroAddress,
        sealerPrivateKey: toHex(privateKey),
        smartWallets,
        images,
      });
      const app = createServer({ ...test.deps, ...chain, smartWallets, images }, imageDir);
      const session = await app.request("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: devIdToken(alice), language: "en" }),
      });
      const { me } = await bodyOf(session, z.object({ me: meSchema }));
      const cookie = session.headers.get("set-cookie")?.split(";")[0];
      if (!cookie) throw new Error("LINE sign-in did not create an API session");
      const ticketResponse = await app.request("/api/tickets/spend", {
        method: "POST",
        headers: { Cookie: cookie, "content-type": "application/json" },
        body: JSON.stringify({ kind: "daily" }),
      });
      const { ticketUse } = await bodyOf(
        ticketResponse,
        z.object({ ticketUse: ticketUseSchema }),
        201,
      );
      const postSeal = () =>
        app.request("/api/stickers", {
          method: "POST",
          headers: { Cookie: cookie },
          body: sealFormData(
            sealParts(ticketUse.id, {
              width: "1",
              height: "1",
              ...Object.fromEntries(
                stickerPngsSchema.keyof().options.map((kind) => [kind, pngFile(png, kind)]),
              ),
            }),
          ),
        });
      const { sticker } = await bodyOf(await postSeal(), sealResponseSchema, 201);
      if (!sticker.tokenId || !sticker.mintTxHash || !isHex(sticker.mintTxHash)) {
        throw new Error("Sealing returned without a confirmed NFT");
      }
      const tokenId = BigInt(sticker.tokenId);
      const receipt = await publicClient.getTransactionReceipt({ hash: sticker.mintTxHash });
      expect(receipt).toMatchObject({ status: "success", from: sealer.address.toLowerCase() });
      await expect(
        publicClient.readContract({
          address: contractAddress,
          abi: stickerNftAbi,
          functionName: "ownerOf",
          args: [tokenId],
        }),
      ).resolves.toBe(artistAddress);
      await expect(publicClient.getBalance({ address: artistAddress })).resolves.toBe(0n);
      expect(
        test.db.select().from(users).where(eq(users.id, me.id)).get()?.smartAccountAddress,
      ).toBe(artistAddress.toLowerCase());
      const persisted = () =>
        test.db.select().from(stickers).where(eq(stickers.id, sticker.id)).get();
      expect(persisted()).toMatchObject({
        ownerId: me.id,
        tokenId: sticker.tokenId,
        mintTxHash: sticker.mintTxHash,
      });
      const metadataUri = await publicClient.readContract({
        address: contractAddress,
        abi: stickerNftAbi,
        functionName: "tokenURI",
        args: [tokenId],
      });
      expect(metadataUri).toBe(persisted()?.metadataUri);
      const metadataResponse = await app.request(metadataUri);
      expect(metadataResponse.status).toBe(200);
      const metadata: unknown = await metadataResponse.json();
      expect(metadata).toMatchObject({ image: sticker.images.png });
      expect(JSON.parse(await readFile(join(imageDir, `${sticker.id}.json`), "utf8"))).toEqual(
        metadata,
      );
      const { webp, ...pngs } = sticker.images;
      for (const image of Object.values(pngs)) {
        const imageResponse = await app.request(image);
        expect(imageResponse.status).toBe(200);
        expect(new Uint8Array(await imageResponse.arrayBuffer())).toEqual(png);
      }
      for (const image of Object.values(webp)) {
        const imageResponse = await app.request(image);
        expect(imageResponse.status).toBe(200);
        expect(imageResponse.headers.get("content-type")).toBe("image/webp");
      }

      // Model a server restart after the chain receipt but before its database update.
      test.db
        .update(stickers)
        .set({ tokenId: null, mintTxHash: null })
        .where(eq(stickers.id, sticker.id))
        .run();
      const nonceBeforeRetry = await publicClient.getTransactionCount({ address: sealer.address });
      expect((await bodyOf(await postSeal(), sealResponseSchema)).sticker).toEqual(sticker);
      expect(persisted()).toMatchObject({
        tokenId: sticker.tokenId,
        mintTxHash: sticker.mintTxHash,
      });
      await expect(publicClient.getTransactionCount({ address: sealer.address })).resolves.toBe(
        nonceBeforeRetry,
      );
      await expect(
        publicClient.readContract({
          address: contractAddress,
          abi: stickerNftAbi,
          functionName: "balanceOf",
          args: [artistAddress],
        }),
      ).resolves.toBe(1n);
      expect(test.db.select().from(stickers).all()).toHaveLength(1);
      expect(privyLookup).toHaveBeenCalledOnce();
      const [input, init] = privyLookup.mock.calls[0];
      expect(await new Request(input, init).json()).toEqual({
        custom_user_id: privySubject(lineChannelId, alice.sub),
      });
      expect(await (await app.request(metadataUri)).json()).toEqual(metadata);
    } finally {
      test.sqlite.close();
      await anvil.close();
      await rm(imageDir, { recursive: true, force: true });
    }
  }, 30_000);
});
