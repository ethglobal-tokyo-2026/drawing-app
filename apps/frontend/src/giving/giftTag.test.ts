import { describe, expect, it } from "vitest";
import { giftTag, sealDate } from "./giftTag";

describe("giftTag", () => {
  it("names the giver by handle, printed with a single @", () => {
    expect(giftTag("alice")).toEqual({ label: "From", name: "@alice" });
    expect(giftTag("@alice")).toEqual(giftTag("alice"));
  });

  it("names the recipient instead when the gift went to an artist in the app", () => {
    expect(giftTag("alice", "mika")).toEqual({ label: "For", name: "@mika" });
  });
});

describe("sealDate", () => {
  it("prints month.day in local time, unpadded, as the tear tape does", () => {
    expect(sealDate(new Date(2026, 8, 23, 21).getTime())).toBe("9.23");
    expect(sealDate(new Date(2026, 9, 5, 0, 30).getTime())).toBe("10.5");
  });
});
