import { stickers, users } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
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
import { labelFromHandle } from "../ens/labels.ts";
import { nameEverything } from "../ens/naming.ts";
import { devIdToken } from "../services/devSignIn.ts";
import { meSchema, personSchema } from "../shapes.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeEns, fakeNameWriter, TEST_GATEWAY_KEY } from "../testing/fakes.ts";
import { insertSealedSticker } from "../testing/rows.ts";

const profileAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node, string key) view returns (string)",
  "function multicall(bytes[] calls) view returns (bytes[])",
]);
const gatewayBodySchema = z.object({ data: z.string() });
const SMART_ACCOUNT = "0x00000000000000000000000000000000000a11ce";

let test: TestApp;

afterEach(() => {
  vi.restoreAllMocks();
});

async function setup(writer: NameWriter | null = null) {
  test = await createTestApp({ ens: fakeEns(writer) });
}

const signIn = async (name: string) => {
  const response = await test.app.request("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idToken: devIdToken({ sub: `line-${name}`, name }),
      timeZone: "Asia/Tokyo",
      language: "en",
    }),
  });
  const [cookie = ""] = (response.headers.get("set-cookie") ?? "").split(";");
  return {
    me: z.object({ me: meSchema }).parse(await response.json()).me,
    headers: { Cookie: cookie },
  };
};

const setHandle = async (headers: Record<string, string>, handle: string) => {
  const response = await test.app.request("/api/me/handle", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ handle }),
  });
  return z.object({ me: meSchema }).parse(await response.json()).me;
};

/** Asks the gateway what `call` answers for `name`, as an ENS client would. */
async function askGateway(
  name: string,
  call: Hex,
  resolver = test.deps.ens?.resolverAddress ?? "",
) {
  const request = encodeGatewayRequest(name, call);
  const response = await test.app.request(`/api/ens/gateway/${resolver}/${request}.json`);
  return { request, response };
}

/** The answer's result, once its signature checks out the way CroquisResolver checks it. */
async function verifiedResult(request: Hex, response: Response) {
  expect(response.status).toBe(200);
  const { data } = gatewayBodySchema.parse(await response.json());
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
    expect(me.ensName).toMatch(/^artist-[0-9a-f]{8}\.croquis\.eth$/);
  });
});

describe("the ENS gateway", () => {
  beforeEach(async () => {
    await setup();
  });

  it("answers for a person without a session, signed by the key CroquisResolver trusts", async () => {
    const alice = insertUser(test.db, { ensLabel: "alice", smartAccountAddress: SMART_ACCOUNT });
    const tokenId = "7";
    insertSealedSticker(test.db, alice, { tokenId, mintTxHash: `0x${"ab".repeat(32)}` });
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
      encodeAbiParameters(
        [{ type: "string" }],
        [`eip155:${ens.chainId}/erc721:${ens.stickerContract.toLowerCase()}/${tokenId}`],
      ),
    ]);
  });

  it("answers empty for a name nobody has", async () => {
    const node = namehash("nobody.croquis.eth");
    const call = encodeFunctionData({ abi: profileAbi, functionName: "text", args: [node, "url"] });
    const { request, response } = await askGateway("nobody.croquis.eth", call);
    expect(
      decodeAbiParameters([{ type: "string" }], await verifiedResult(request, response))[0],
    ).toBe("");
  });

  it("answers a database failure as its own, not the caller's unsupported_request", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    test.sqlite.close();
    const node = namehash("alice.croquis.eth");
    const call = encodeFunctionData({ abi: profileAbi, functionName: "text", args: [node, "url"] });
    const { response } = await askGateway("alice.croquis.eth", call);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: "internal_error" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("request.failed"));
  });

  it("answers only its own resolver", async () => {
    const call = encodeFunctionData({
      abi: profileAbi,
      functionName: "addr",
      args: [namehash("a.croquis.eth")],
    });
    const { response } = await askGateway("a.croquis.eth", call, `0x${"12".repeat(20)}`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "unknown_resolver" });
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
    test.deps.ens = fakeEns(writer);
    await nameEverything(test.deps, alice);
    expect(calls).toEqual([
      "sticker 2 0002",
      `avatar eip155:11155111/erc721:${fakeEns().stickerContract.toLowerCase()}/2`,
    ]);
    expect(namedAt(second)).not.toBeNull();
  });

  it("finds a person by their name", async () => {
    await setup();
    const { headers } = await signIn("Alice");
    const response = await test.app.request("/api/ens/people/Alice", { headers });
    expect(response.status).toBe(200);
    expect(z.object({ person: personSchema }).parse(await response.json()).person).toMatchObject({
      handle: "Alice",
      ensName: "alice.croquis.eth",
    });
  });
});
