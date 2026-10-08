import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DAILY_TICKETS_PER_DAY, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY } from "@drawing-app/db";
import { describe, expect, it } from "vitest";
import { TEST_CHAT_MENU_IDS } from "../testing/fakeLine.ts";
import {
  chatMenuFor,
  menuToLink,
  midnightMoves,
  readChatMenuIds,
  type ChatMenuIds,
} from "./menus.ts";

/** The chat menus the box links people to. */
const DEPLOYED_MENU_IDS = readChatMenuIds(
  fileURLToPath(new URL("../../../../deploy/line/menus.json", import.meta.url)),
);

/** Writes `contents` to a menus.json of its own and returns its path. */
function menusFile(contents: unknown) {
  const path = join(mkdtempSync(join(tmpdir(), "chat-menus-")), "menus.json");
  writeFileSync(path, JSON.stringify(contents));
  return path;
}

/**
 * A family's menus as chatMenuFor names them: each count from the full day's down, then reserve
 * and none.
 */
function familyOf(kyotoSeikaPractice: boolean) {
  const perDay = kyotoSeikaPractice ? KYOTO_SEIKA_DAILY_TICKETS_PER_DAY : DAILY_TICKETS_PER_DAY;
  const counts = Array.from({ length: perDay }, (_, used) => perDay - used);
  return [
    ...counts.map((dailyLeft) => chatMenuFor({ dailyLeft, reserveLeft: 0 }, kyotoSeikaPractice)),
    chatMenuFor({ dailyLeft: 0, reserveLeft: 1 }, kyotoSeikaPractice),
    chatMenuFor({ dailyLeft: 0, reserveLeft: 0 }, kyotoSeikaPractice),
  ];
}

/** Where the midnight batch leaves someone on `menu`. */
const afterMidnight = (ids: ChatMenuIds, menu: string) =>
  midnightMoves(ids).find(({ from }) => from === menu)?.to ?? menu;

describe("the chat menu map", () => {
  it("reads deploy/line/menus.json, counting a menu left out, null or empty as not made yet", () => {
    const { en, default: fallback } = TEST_CHAT_MENU_IDS;
    const path = menusFile({ en: { plain: en.plain, "3": null, "2": "" }, default: fallback });
    expect(readChatMenuIds(path)).toEqual({ en: { plain: en.plain }, default: fallback });
  });

  it("refuses a map with something other than a rich menu ID in it", () => {
    for (const placeholder of ["richmenu-…", "richmenu-TODO"]) {
      expect(() => readChatMenuIds(menusFile({ en: { "3": placeholder } }))).toThrow(
        /Expected a rich menu ID/,
      );
    }
  });

  it("picks the menu for what the Draw key shows: daily tickets first, then reserve ones", () => {
    const menus = [3, 2, 1, 0].map((dailyLeft) =>
      chatMenuFor({ dailyLeft, reserveLeft: 0 }, false),
    );
    expect(menus).toEqual(["3", "2", "1", "none"]);
    expect(chatMenuFor({ dailyLeft: 0, reserveLeft: 4 }, false)).toBe("reserve");
    expect(chatMenuFor({ dailyLeft: 2, reserveLeft: 4 }, false)).toBe("2");
  });

  it("gives Kyoto Seika Manga Expression Practice Mode a menu of its own for each count of its allowance, then reserve and none", () => {
    const kyotoSeika = familyOf(true);
    expect(new Set(kyotoSeika).size).toBe(KYOTO_SEIKA_DAILY_TICKETS_PER_DAY + 2);
    expect(kyotoSeika.filter((menu) => familyOf(false).includes(menu))).toEqual([]);
  });

  it("refuses a map where one of Kyoto Seika Manga Expression Practice Mode's menus shares its rich menu with a standard one", () => {
    const { en } = TEST_CHAT_MENU_IDS;
    const path = menusFile({ en: { "3": en["3"], "kyoto-seika-3": en["3"] } });
    expect(() => readChatMenuIds(path)).toThrow(/kyoto-seika-3/);
  });

  it("links a missing menu's plain one, and nothing without that", () => {
    const { en } = TEST_CHAT_MENU_IDS;
    const ids = { en: { plain: en.plain, "3": en["3"] } };
    expect(menuToLink(ids, "en", "3")).toEqual({ menu: "3", richMenuId: en["3"] });
    expect(menuToLink(ids, "en", "2")).toEqual({ menu: "plain", richMenuId: en.plain });
    expect(menuToLink(ids, "ja", "2")).toBeNull();
  });

  it("moves each family back to its full count at midnight, in each language, and leaves the plain menu", () => {
    const { en, ja } = TEST_CHAT_MENU_IDS;
    for (const menus of [en, ja]) {
      for (const kyotoSeika of [false, true]) {
        const [full, ...rest] = familyOf(kyotoSeika);
        for (const menu of rest) {
          expect(afterMidnight(TEST_CHAT_MENU_IDS, menus[menu])).toBe(menus[full]);
        }
      }
      expect(afterMidnight(TEST_CHAT_MENU_IDS, menus.plain)).toBe(menus.plain);
    }
    // A language without a full-count menu has nothing to move to.
    expect(midnightMoves({ en: { plain: en.plain }, ja })).toEqual(midnightMoves({ ja }));
  });

  it.each([
    { which: "deploy/line/menus.json", ids: DEPLOYED_MENU_IDS },
    { which: "every menu made", ids: TEST_CHAT_MENU_IDS },
  ])(
    "leaves everyone, after midnight, on their mode's full count or on a menu that shows none, with $which",
    ({ ids }) => {
      for (const language of ["en", "ja"] as const) {
        const menus = ids[language];
        for (const kyotoSeika of [false, true]) {
          const family = familyOf(kyotoSeika);
          for (const wanted of family) {
            const linked = menuToLink(ids, language, wanted);
            if (!linked) continue;
            const after = afterMidnight(ids, linked.richMenuId);
            expect([menus?.[family[0]], menus?.plain], `${language} ${wanted}`).toContain(after);
          }
        }
      }
    },
  );
});
