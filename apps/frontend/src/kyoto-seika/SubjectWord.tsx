import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { hasKanji } from "./subjectList";

/**
 * A Kyoto Seika Subject's word as the test prints it. A word with kanji carries its whole reading
 * over it as one ruby, as a dictionary gives a word's reading rather than each kanji's.
 */
export function SubjectWord({ subject }: { subject: KyotoSeikaSubject }) {
  if (!hasKanji(subject.ja)) return <span lang="ja">{subject.ja}</span>;
  return (
    <ruby lang="ja">
      {subject.ja}
      <rt>{subject.reading}</rt>
    </ruby>
  );
}
