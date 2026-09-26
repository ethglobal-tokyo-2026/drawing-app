import { describe, expect, it } from "vitest";
import { sheetRows, toCsv } from "./translatorSheet";

describe("the translator's sheet", () => {
  it("leaves the developer slip's text out of the export", () => {
    const en = {
      board: { title: "Board", developer: { debug: "Debug" }, slip: { developer: { id: "ID" } } },
    };
    const csv = toCsv(sheetRows(en, {}));
    expect(csv).toContain("board.title");
    expect(csv).not.toContain("developer");
  });
});
