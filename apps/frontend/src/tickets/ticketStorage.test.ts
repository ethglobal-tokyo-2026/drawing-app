import { describe, expect, it } from "vitest";
import { parseStoredTickets } from "./ticketStorage";

describe("parseStoredTickets", () => {
  it("reads back what was stored", () => {
    const state = { day: "2026-09-24", uses: [{}, { stickerId: "sunset" }], paid: 2 };
    expect(parseStoredTickets(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("moves the count-only shape onto uses that carry no sticker", () => {
    expect(parseStoredTickets({ day: "2026-09-24", usedFree: 2, paid: 1 })).toEqual({
      day: "2026-09-24",
      uses: [{}, {}],
      paid: 1,
    });
  });

  it("rejects values it can't trust", () => {
    const day = "2026-09-24";
    for (const unreadable of [
      null,
      "3",
      [],
      { day, uses: [] },
      { day: "yesterday", uses: [], paid: 0 },
      { day, uses: [], paid: -1 },
      { day, uses: [], paid: 1.5 },
      { day, uses: {}, paid: 0 },
      { day, uses: [{ stickerId: 7 }], paid: 0 },
      { day, uses: [null], paid: 0 },
      { day, usedFree: -1, paid: 0 },
      { day, usedFree: 1e9, paid: 0 },
    ])
      expect(parseStoredTickets(unreadable), JSON.stringify(unreadable)).toBeNull();
  });
});
