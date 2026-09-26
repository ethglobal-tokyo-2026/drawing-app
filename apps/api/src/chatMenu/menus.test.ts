import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TEST_CHAT_MENU_IDS } from "../testing/fakeLine.ts";
import { chatMenuFor, menuToLink, midnightMoves, readChatMenuIds } from "./menus.ts";

/** Writes `contents` to a menus.json of its own and returns its path. */
function menusFile(contents: unknown) {
  const path = join(mkdtempSync(join(tmpdir(), "chat-menus-")), "menus.json");
  writeFileSync(path, JSON.stringify(contents));
  return path;
}

describe("the chat menu map", () => {
  it("reads deploy/line/menus.json, counting a menu left out, null or empty as not made yet", () => {
    const path = menusFile({
      en: { plain: "richmenu-0123abcd", "3": null, "2": "" },
      default: "richmenu-default",
    });
    expect(readChatMenuIds(path)).toEqual({
      en: { plain: "richmenu-0123abcd" },
      default: "richmenu-default",
    });
  });

  it("refuses a map with something other than a rich menu ID in it", () => {
    expect(() => readChatMenuIds(menusFile({ en: { "3": "richmenu-…" } }))).toThrow(
      /Expected a rich menu ID/,
    );
  });

  it("picks the menu for what the Draw key shows: daily tickets first, then reserve ones", () => {
    const menus = [3, 2, 1, 0].map((dailyLeft) => chatMenuFor({ dailyLeft, reserveLeft: 0 }));
    expect(menus).toEqual(["3", "2", "1", "none"]);
    expect(chatMenuFor({ dailyLeft: 0, reserveLeft: 4 })).toBe("reserve");
    expect(chatMenuFor({ dailyLeft: 2, reserveLeft: 4 })).toBe("2");
  });

  it("links a missing menu's plain one, and nothing without that", () => {
    const ids = { en: { plain: "richmenu-en-plain", "3": "richmenu-en-3" } };
    expect(menuToLink(ids, "en", "3")).toEqual({ menu: "3", richMenuId: "richmenu-en-3" });
    expect(menuToLink(ids, "en", "2")).toEqual({ menu: "plain", richMenuId: "richmenu-en-plain" });
    expect(menuToLink(ids, "ja", "2")).toBeNull();
  });

  it("moves each language's other menus onto its 3 menu at midnight", () => {
    const { en, ja } = TEST_CHAT_MENU_IDS;
    expect(midnightMoves(TEST_CHAT_MENU_IDS)).toEqual(
      [en, ja].flatMap((menus) =>
        [menus.plain, menus["2"], menus["1"], menus.reserve, menus.none].map((from) => ({
          from,
          to: menus["3"],
        })),
      ),
    );
    // A language without a 3 menu has nothing to move to.
    expect(midnightMoves({ en: { plain: en.plain }, ja })).toHaveLength(5);
  });
});
