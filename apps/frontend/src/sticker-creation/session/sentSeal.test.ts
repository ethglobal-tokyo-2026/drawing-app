import { describe, expect, it } from "vitest";
import { FRESH_TICKETS } from "../../api/testing";
import { sentSealOutcome } from "./sentSeal";

const sticker = { id: "sticker-1", outline: "M0 0Z", width: 10, height: 10 };
const ticketsUsing = (...uses: { id: number; sealed: boolean }[]) => ({
  ...FRESH_TICKETS,
  usedToday: uses.map(({ id, sealed }, dayIndex) => ({
    id,
    dayIndex,
    kind: "daily" as const,
    sticker: sealed ? sticker : null,
  })),
});

describe("sentSealOutcome", () => {
  it("reads what became of a seal that went out from the ticket use's sticker", () => {
    const tickets = ticketsUsing({ id: 4, sealed: true }, { id: 7, sealed: false });
    expect(sentSealOutcome(4, tickets)).toBe("sealed");
    expect(sentSealOutcome(7, tickets)).toBe("unsealed");
    // Spent before today: the tickets can't say.
    expect(sentSealOutcome(2, tickets)).toBeNull();
  });
});
