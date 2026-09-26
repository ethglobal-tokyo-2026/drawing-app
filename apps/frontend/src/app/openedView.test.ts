import { describe, expect, it } from "vitest";
import { openedFrom } from "./openedView";

// The LINE chat menu's tiles and the gift message link to these paths, so they're a contract with LINE.
describe("what a link opens", () => {
  it("opens Draw and Explore from the chat menu's links", () => {
    expect(openedFrom("/draw")).toEqual({ view: "draw" });
    expect(openedFrom("/explore")).toEqual({ view: "explore" });
    expect(openedFrom("/draw/")).toEqual({ view: "draw" });
  });

  it("opens a gift message's link on the board, holding its Gift Claim Token", () => {
    expect(openedFrom("/g/abc")).toEqual({ view: "board", giftClaimToken: "abc" });
  });

  it("opens the board for the root and any other path", () => {
    expect(openedFrom("/")).toEqual({ view: "board" });
    expect(openedFrom("")).toEqual({ view: "board" });
    expect(openedFrom("/g/")).toEqual({ view: "board" });
    expect(openedFrom("/drawing")).toEqual({ view: "board" });
  });
});
