// @vitest-environment happy-dom
import { afterAll, expect } from "vitest";
import { act } from "react";
import { i18next } from "../../../../apps/frontend/src/i18n/i18n";
import "../../../../apps/frontend/src/kyoto-seika/SubjectThought.test.tsx";
import "../../../../apps/frontend/src/kyoto-seika/SubjectWord.test.tsx";

// The original tests run unchanged; inspect what their afterEach cleanup left behind.
afterAll(async () => {
  const thoughts = document.querySelectorAll(".subject-thought").length;
  const words = document.querySelectorAll('ruby[lang="ja"]').length;
  const text = () =>
    [...document.querySelectorAll(".subject-thought__words")].map((el) => el.textContent);
  const before = text();
  await act(() => i18next.changeLanguage("ja"));
  const after = text();
  console.log(
    JSON.stringify({
      remainingThoughtRoots: thoughts,
      remainingJapaneseRubyElements: words,
      beforeLanguageChange: before,
      afterLanguageChange: after,
    }),
  );
  expect(thoughts, "Every SubjectThought root should be unmounted after the suite").toBe(0);
});
