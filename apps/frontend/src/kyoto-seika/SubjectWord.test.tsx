// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SubjectWord } from "./SubjectWord";
import { SPORTS, TEST_SUBJECTS } from "./testSubjects";

const cleanups: Array<() => void> = [];

function render(node: React.ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  cleanups.push(() => {
    root.unmount();
    host.remove();
  });
  act(() => root.render(node));
  return host;
}

describe("a subject's word", () => {
  afterEach(() => {
    act(() => cleanups.splice(0).forEach((cleanup) => cleanup()));
    expect(document.querySelectorAll('ruby[lang="ja"]')).toHaveLength(0);
  });

  it("sets the whole word's reading over a word with kanji as one ruby, and none over any other", () => {
    const schoolchild = TEST_SUBJECTS.find((s) => s.ja === "小学生");
    if (!schoolchild) throw new Error("the test list has no 小学生");
    const ruby = render(<SubjectWord subject={schoolchild} />).querySelector('ruby[lang="ja"]');
    expect([...(ruby?.querySelectorAll("rt") ?? [])].map((rt) => rt.textContent)).toEqual([
      "しょうがくせい",
    ]);
    const bare = render(<SubjectWord subject={SPORTS} />);
    expect(bare.querySelector("rt")).toBeNull();
    expect(bare.querySelector('[lang="ja"]')?.textContent).toBe("スポーツ");
  });
});
