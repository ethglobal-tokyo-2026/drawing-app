import { describe, expect, it } from "vitest";
import { parseStoredTickets } from "./ticketStorage";

describe("parseStoredTickets", () => {
  it("reads back what was stored", () => {
    const state = { day: "2026-09-24", uses: [{}, { stickerId: "sunset" }], reserve: 2 };
    expect(parseStoredTickets(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("rejects values it can't trust", () => {
    const day = "2026-09-24";
    for (const unreadable of [
      null,
      "3",
      [],
      { day, uses: [] },
      { day, uses: [], paid: 0 },
      { day: "yesterday", uses: [], reserve: 0 },
      { day, uses: [], reserve: -1 },
      { day, uses: [], reserve: 1.5 },
      { day, uses: {}, reserve: 0 },
      { day, uses: [{ stickerId: 7 }], reserve: 0 },
      { day, uses: [null], reserve: 0 },
    ])
      expect(parseStoredTickets(unreadable), JSON.stringify(unreadable)).toBeNull();
  });
});
