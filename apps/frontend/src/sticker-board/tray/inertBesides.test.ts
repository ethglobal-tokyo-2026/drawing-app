// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { inertBesides } from "./inertBesides";

const el = (tag: string, ...kids: Element[]) => {
  const node = document.createElement(tag);
  node.append(...kids);
  return node;
};

describe("inertBesides", () => {
  it("makes everything around the dialog inert, at every level up to the board, and puts it back", () => {
    const dialog = el("div");
    const near = el("button");
    const far = el("button");
    const outside = el("button");
    const board = el("div", far, el("div", near, dialog));
    document.body.append(board, outside);

    const undo = inertBesides(dialog, board);
    expect(near.hasAttribute("inert")).toBe(true);
    expect(far.hasAttribute("inert")).toBe(true);
    expect(dialog.hasAttribute("inert")).toBe(false);
    expect(board.hasAttribute("inert")).toBe(false);
    // Outside the board isn't covered by the dialog, so it stays as it was.
    expect(outside.hasAttribute("inert")).toBe(false);

    undo();
    expect(near.hasAttribute("inert")).toBe(false);
    expect(far.hasAttribute("inert")).toBe(false);
    board.remove();
    outside.remove();
  });

  it("leaves inert what was already inert when it goes", () => {
    const dialog = el("div");
    const already = el("button");
    already.setAttribute("inert", "");
    const board = el("div", already, dialog);
    document.body.append(board);

    inertBesides(dialog, board)();
    expect(already.hasAttribute("inert")).toBe(true);
    board.remove();
  });

  it("refuses a dialog that isn't inside the board", () => {
    expect(() => inertBesides(el("div"), el("div"))).toThrow(/inside the board/);
  });
});
