import { describe, expect, it } from "vitest";
import { giftTag } from "./giftTag";

describe("giftTag", () => {
  it("names the giver by handle, printed with a single @", () => {
    expect(giftTag("alice")).toEqual({ label: "from", name: "@alice" });
    expect(giftTag("@alice")).toEqual(giftTag("alice"));
  });

  it("names the recipient instead when the gift went to an artist in the app", () => {
    expect(giftTag("alice", "mika")).toEqual({ label: "for", name: "@mika" });
  });
});
