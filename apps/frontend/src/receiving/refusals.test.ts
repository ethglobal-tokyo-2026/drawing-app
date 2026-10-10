import { beforeEach, describe, expect, it } from "vitest";
import { people } from "../api/testFixtures";
import { toPerson } from "../api/views";
import { inLanguage } from "../ui/testing";
import { refusalScreen } from "./refusals";

describe("refusalScreen", () => {
  it("names the giver, or says the giver when the refusal came without them", () => {
    expect(refusalScreen("taken_back", toPerson(people.mika)).title).toBe(
      "Mika Hoshino took this one back",
    );
    expect(refusalScreen("taken_back", null).title).toBe("The giver took this one back");
  });

  describe("in Japanese", () => {
    beforeEach(() => inLanguage("ja"));

    it("says an already opened gift opens once", () => {
      expect(refusalScreen("already_received", null)).toMatchObject({
        title: "開封済み",
        line: "ギフトメッセージをひらけるのは一度だけです。あなたがひらいたなら、シールはシールボードにあります。",
      });
    });
  });
});
