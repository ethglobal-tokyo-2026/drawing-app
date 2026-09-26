import { describe, expect, it } from "vitest";
import { createGiftStore, memoryStorage } from "./giftStore";
import { createLocalGiftBackend } from "./localGiftBackend";

const sticker = (id: string) => ({ id, no: 147, timeUsed: 292 });

function setup() {
  const store = createGiftStore(memoryStorage());
  const backend = createLocalGiftBackend({ store, fromHandle: "alice", liffId: "123-abc" });
  return { store, backend };
}

const codeOf = (link: string) => link.split("/g/")[1];
const linkOf = (card: unknown) => /"uri":"([^"]*)"/.exec(JSON.stringify(card))?.[1] ?? "";

describe("local gift backend", () => {
  it("packs each gift with its own unguessable code, in the chain's bytes32 format", async () => {
    const { store, backend } = setup();
    const a = await backend.pack(sticker("s1"));
    const b = await backend.pack(sticker("s2"));
    expect(codeOf(linkOf(a.card))).toMatch(/^0x[0-9a-f]{64}$/);
    expect(codeOf(linkOf(a.card))).not.toBe(codeOf(linkOf(b.card)));
    expect(a.giftId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(store.get(a.giftId)?.state).toBe("packed");
  });

  it("keeps one open gift per sticker", async () => {
    const { store, backend } = setup();
    const first = await backend.pack(sticker("s1"));
    const second = await backend.pack(sticker("s1"));
    expect(store.get(first.giftId)).toMatchObject({ state: "not_sent", reason: "abandoned" });
    expect(store.get(second.giftId)?.state).toBe("packed");
  });

  it("won't pack a sticker that was already sent", async () => {
    const { backend } = setup();
    const gift = await backend.pack(sticker("s1"));
    await backend.markSent(gift.giftId);
    await expect(backend.pack(sticker("s1"))).rejects.toThrow(/already/);
  });

  it("settles a gift once", async () => {
    const { store, backend } = setup();
    const gift = await backend.pack(sticker("s1"));
    await backend.markNotSent(gift.giftId, "send_failed", "picker crashed");
    expect(store.get(gift.giftId)).toMatchObject({ state: "not_sent", error: "picker crashed" });
    await expect(backend.markSent(gift.giftId)).rejects.toThrow(/closed/);
  });
});
