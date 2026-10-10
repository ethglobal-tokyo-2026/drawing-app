// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { inLanguage } from "../ui/testing";
import type { PairSize } from "./balloonGeometry";
import { SubjectThought } from "./SubjectThought";
import { DETAIL_TOWARD } from "./thoughtLayout";
import { REUNION, SPORTS, WIND } from "./testSubjects";

let cleanup = () => {};
afterEach(() => cleanup());

/** The pair's clouds at `size`, in `language`. */
async function thought(size: PairSize, language: "en" | "ja", pair = [WIND, REUNION] as const) {
  await inLanguage(language);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(<SubjectThought subjects={pair} size={size} toward={DETAIL_TOWARD} reduced />),
  );
  cleanup = () => {
    act(() => root.unmount());
    host.remove();
  };
  const clouds = host.querySelector(".subject-thought");
  if (!clouds) throw new Error("No thought clouds");
  return clouds;
}

const readings = (clouds: Element) =>
  [...clouds.querySelectorAll("rt")].map((rt) => rt.textContent);
const words = (clouds: Element) =>
  [...clouds.querySelectorAll(".subject-thought__words")].map((w) => w.textContent);

describe("a sticker's subjects in thought clouds", () => {
  it("is hidden from screen readers, which hear the pair with the sticker instead", async () => {
    expect((await thought("peek", "en")).getAttribute("aria-hidden")).toBe("true");
    expect((await thought("detail", "ja")).getAttribute("aria-hidden")).toBe("true");
  });

  it("sets readings over kanji only in the detail in Japanese", async () => {
    expect(readings(await thought("detail", "ja", [WIND, SPORTS]))).toEqual([WIND.reading]);
    const peek = await thought("peek", "ja");
    expect(readings(peek)).toEqual([]);
    expect(words(peek)).toEqual([WIND.ja, REUNION.ja]);
  });

  it("letters each subject's English in English, with no Japanese or readings", async () => {
    for (const size of ["peek", "detail"] as const) {
      const clouds = await thought(size, "en");
      expect(words(clouds)).toEqual([WIND.en.toUpperCase(), REUNION.en.toUpperCase()]);
      expect(readings(clouds)).toEqual([]);
    }
  });
});
