import { stickers, users } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { gatewayDigest, encodeGatewayRequest } from "@drawing-app/sticker-chain/ens-gateway";
import { eq } from "drizzle-orm";
import {
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  isAddress,
  isHex,
  namehash,
  parseAbi,
  recoverAddress,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { NameWriter } from "../deps.ts";
import { fallbackLabel, labelFromHandle } from "../ens/labels.ts";
import { nameEverything } from "../ens/naming.ts";
import { devIdToken } from "../services/devSignIn.ts";
import { meSchema, personSchema } from "../shapes.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeEns, fakeNameWriter, fakeSmartWallets, TEST_GATEWAY_KEY } from "../testing/fakes.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import { insertSealedSticker } from "../testing/rows.ts";

const profileAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node, string key) view returns (string)",
  "function multicall(bytes[] calls) view returns (bytes[])",
]);
const gatewayBodySchema = z.object({ data: z.string() });
const meBodySchema = z.object({ me: meSchema });
const SMART_ACCOUNT = "0x00000000000000000000000000000000000a11ce";

let test: TestApp;

afterEach(() => {
  vi.restoreAllMocks();
});

async function setup(writer: NameWriter | null = null) {
  test = await createTestApp(({ db }) => ({
    ens: fakeEns(writer),
    smartWallets: fakeSmartWallets(db),
  }));
}

const signIn = async (name: string) => {
  const idToken = devIdToken({ sub: `line-${name}`, name });
  const response = await test.send("POST", "/api/session", {
    body: { idToken, language: "en" },
  });
  const [cookie = ""] = (response.headers.get("set-cookie") ?? "").split(";");
  return { me: (await bodyOf(response, meBodySchema)).me, headers: { Cookie: cookie } };
};

const setHandle = async (headers: Record<string, string>, handle: string) => {
  const response = await test.send("POST", "/api/me/handle", { headers, body: { handle } });
  return (await bodyOf(response, meBodySchema)).me;
};

/** Asks the gateway what `call` answers for `name`, as an ENS client would. */
async function askGateway(
  name: string,
  call: Hex,
  resolver = test.deps.ens?.resolverAddress ?? "",
) {
  const request = encodeGatewayRequest(name, call);
  const response = await test.send("GET", `/api/ens/gateway/${resolver}/${request}.json`);
  return { request, response };
}

/** The answer's result, once its signature checks out the way CroquisResolver checks it. */
async function verifiedResult(request: Hex, response: Response) {
  const { data } = await bodyOf(response, gatewayBodySchema);
  const resolver = test.deps.ens?.resolverAddress;
  if (!isHex(data) || !resolver || !isAddress(resolver)) throw new Error("No gateway answer");
  const [result, expires, signature] = decodeAbiParameters(
    [{ type: "bytes" }, { type: "uint64" }, { type: "bytes" }],
    data,
  );
  const signer = await recoverAddress({
    hash: gatewayDigest(resolver, expires, request, result),
    signature,
  });
  expect(signer).toBe(privateKeyToAccount(TEST_GATEWAY_KEY).address);
  return result;
}

/** The `key` text record the gateway answers for `name`. */
async function gatewayText(name: string, key: string) {
  const call = encodeFunctionData({
    abi: profileAbi,
    functionName: "text",
    args: [namehash(name), key],
  });
  const { request, response } = await askGateway(name, call);
  return decodeAbiParameters([{ type: "string" }], await verifiedResult(request, response))[0];
}

/** ENSIP-12's avatar for the test sticker contract's token `tokenId`. */
const avatarFor = (tokenId: string) => {
  const ens = fakeEns();
  return `eip155:${ens.chainId}/erc721:${ens.stickerContract.toLowerCase()}/${tokenId}`;
};

/** A sticker `artistId` sealed, minted as `tokenId`. */
const mintedSticker = (artistId: string, tokenId: string, values: { nsfw?: boolean } = {}) =>
  insertSealedSticker(test.db, artistId, { tokenId, mintTxHash: bytes32(tokenId), ...values });

describe("ENS labels", () => {
  it.each([
    ["Alice", "alice"],
    ["Alice Smith", "alice-smith"],
    ["a.b..c", "a-b-c"],
    ["あきら", "あきら"],
    ["gifts", null],
    ["a_b", null],
    ["   ", null],
  ])("makes %j into %j", (handle, label) => {
    expect(labelFromHandle(handle)).toBe(label);
  });

  it("follows the handle until the name is onchain, then stays", async () => {
    await setup();
    const { me, headers } = await signIn("Alice");
    expect(me.ensName).toBe("alice.croquis.eth");
    expect((await setHandle(headers, "Alice Smith")).ensName).toBe("alice-smith.croquis.eth");

    test.db.update(users).set({ ensNamedAt: new Date() }).where(eq(users.id, me.id)).run();
    expect((await setHandle(headers, "Someone Else")).ensName).toBe("alice-smith.croquis.eth");
  });

  it("gives someone whose label is taken one from their user ID", async () => {
    await setup();
    insertUser(test.db, { handle: "Alice-Two", ensLabel: "alice" });
    const { me } = await signIn("ALICE");
    expect(me.ensName).toBe(`${fallbackLabel(me.id)}.croquis.eth`);
  });
});

describe("the ENS gateway", () => {
  beforeEach(async () => {
    await setup();
  });

  it("answers for a person without a session, signed by the key CroquisResolver trusts", async () => {
    const alice = insertUser(test.db, { ensLabel: "alice", smartAccountAddress: SMART_ACCOUNT });
    const tokenId = "7";
    mintedSticker(alice, tokenId);
    const node = namehash("alice.croquis.eth");
    const call = encodeFunctionData({
      abi: profileAbi,
      functionName: "multicall",
      args: [
        [
          encodeFunctionData({ abi: profileAbi, functionName: "addr", args: [node] }),
          encodeFunctionData({ abi: profileAbi, functionName: "text", args: [node, "url"] }),
          encodeFunctionData({ abi: profileAbi, functionName: "text", args: [node, "avatar"] }),
        ],
      ],
    });

    const { request, response } = await askGateway("alice.croquis.eth", call);
    const result = await verifiedResult(request, response);

    const ens = fakeEns();
    expect(decodeAbiParameters([{ type: "bytes[]" }], result)[0]).toEqual([
      encodeAbiParameters([{ type: "address" }], [SMART_ACCOUNT]),
      encodeAbiParameters([{ type: "string" }], [`${ens.appLinkBase}/@alice`]),
      encodeAbiParameters([{ type: "string" }], [avatarFor(tokenId)]),
    ]);
  });

  it("leaves NSFW stickers out of the avatar, which ENS apps show unblurred", async () => {
    const alice = insertUser(test.db, { ensLabel: "alice" });
    mintedSticker(alice, "1");
    mintedSticker(alice, "2", { nsfw: true });
    expect(await gatewayText("alice.croquis.eth", "avatar")).toBe(avatarFor("1"));
  });

  it("answers empty for a name nobody has", async () => {
    expect(await gatewayText("nobody.croquis.eth", "url")).toBe("");
  });

  it("answers a database failure as its own, not the caller's unsupported_request", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    test.sqlite.close();
    const node = namehash("alice.croquis.eth");
    const call = encodeFunctionData({ abi: profileAbi, functionName: "text", args: [node, "url"] });
    const { response } = await askGateway("alice.croquis.eth", call);
    expect(await refusalOf(response)).toMatchObject({ status: 500, error: "internal_error" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("request.failed"));
  });

  it("answers only its own resolver", async () => {
    const call = encodeFunctionData({
      abi: profileAbi,
      functionName: "addr",
      args: [namehash("a.croquis.eth")],
    });
    const { response } = await askGateway("a.croquis.eth", call, `0x${"12".repeat(20)}`);
    expect(await refusalOf(response)).toMatchObject({ status: 404, error: "unknown_resolver" });
  });
});

describe("naming", () => {
  it("names the person, then each minted sticker, and picks up where a failed run stopped", async () => {
    const failing = fakeNameWriter({ failAt: "sticker 2 0002" });
    await setup(failing.writer);
    const alice = insertUser(test.db, { handle: "Alice", smartAccountAddress: SMART_ACCOUNT });
    const first = insertSealedSticker(test.db, alice, {
      number: 1,
      tokenId: "1",
      mintTxHash: `0x${"01".repeat(32)}`,
    });
    const second = insertSealedSticker(test.db, alice, {
      number: 2,
      tokenId: "2",
      mintTxHash: `0x${"02".repeat(32)}`,
    });
    insertSealedSticker(test.db, alice, { number: 3 });

    await expect(nameEverything(test.deps, alice)).rejects.toThrow(
      "Naming failed at sticker 2 0002",
    );
    expect(failing.calls).toEqual(["person alice", "sticker 1 0001"]);
    const namedAt = (id: string) =>
      test.db.select({ at: stickers.ensNamedAt }).from(stickers).where(eq(stickers.id, id)).get()
        ?.at;
    expect(namedAt(first)).not.toBeNull();
    expect(namedAt(second)).toBeNull();

    const { writer, calls } = fakeNameWriter();
    const ens = fakeEns(writer);
    test.deps.ens = ens;
    await nameEverything(test.deps, alice);
    expect(calls).toEqual(["sticker 2 0002", `avatar ${avatarFor("2")}`]);
    expect(namedAt(second)).not.toBeNull();
  });

  it("finds a person by their name", async () => {
    await setup();
    const { headers } = await signIn("Alice");
    const response = await test.send("GET", "/api/ens/people/Alice", { headers });
    expect((await bodyOf(response, z.object({ person: personSchema }))).person).toMatchObject({
      handle: "Alice",
      ensName: "alice.croquis.eth",
    });
  });
});
