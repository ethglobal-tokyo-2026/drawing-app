import { describe, expect, it } from "vitest";
import { viewFromPath } from "./openedView";

// The LINE chat menu's tiles link to these paths, so they're a contract with the menu in LINE.
describe("the screen a link opens", () => {
  it("opens Draw and Explore from the chat menu's links", () => {
    expect(viewFromPath("/draw")).toBe("draw");
    expect(viewFromPath("/explore")).toBe("explore");
    expect(viewFromPath("/draw/")).toBe("draw");
  });

  it("opens the board for the root and any other path", () => {
    expect(viewFromPath("/")).toBe("board");
    expect(viewFromPath("")).toBe("board");
    expect(viewFromPath("/g/some-gift-code")).toBe("board");
    expect(viewFromPath("/drawing")).toBe("board");
  });
});
