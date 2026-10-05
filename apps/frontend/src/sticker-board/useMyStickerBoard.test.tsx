// @vitest-environment happy-dom
import type { StickerBoard } from "@drawing-app/api/client";
import { act, useLayoutEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../api/apiClient";
import { people } from "../api/testFixtures";
import { emptyApi, renderWithApi } from "../api/testing";
import { forgetMyStickerBoardUnlessFor, useMyStickerBoard } from "./useMyStickerBoard";

describe("useMyStickerBoard", () => {
  it.each([
    ["shows the answer it kept to the account it was loaded for", people.mika.id, "ready"],
    ["forgets the answer it kept once another account signs in", people.ken.id, "loading"],
  ])("%s", async (_, signedIn, shown) => {
    const board: StickerBoard = { owner: people.mika, boardStickers: [] };
    // Only the first load answers, so a reader mounted later shows a kept answer or nothing.
    const stickerBoard = vi
      .fn<ApiClient["stickerBoard"]>()
      .mockResolvedValueOnce(board)
      .mockReturnValue(new Promise(() => {}));
    const seen: string[] = [];
    function Reader() {
      const read = useMyStickerBoard();
      useLayoutEffect(() => void seen.push(read.state));
      return null;
    }
    const view = renderWithApi(<Reader />, emptyApi({ stickerBoard }));
    await act(async () => {});
    view.rerender(null);

    forgetMyStickerBoardUnlessFor(signedIn);
    seen.length = 0;
    view.rerender(<Reader />);
    expect(seen[0]).toBe(shown);
    view.unmount();
  });
});
