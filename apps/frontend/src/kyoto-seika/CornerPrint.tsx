import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import "./corner-print.css";

/**
 * The sheet's two Kyoto Seika Subjects once Begin locked them in: the words alone, faint in
 * non-repro blue, as a note in a manga page's margin, under the ink. The canvas's name says the pair
 * to screen readers.
 */
export function CornerPrint({
  subjects,
}: {
  subjects: readonly [KyotoSeikaSubject, KyotoSeikaSubject];
}) {
  return (
    <div className="corner-print" aria-hidden="true" lang="ja">
      {subjects.map((subject) => (
        <span key={subject.ja} className="corner-print__word">
          {subject.ja}
        </span>
      ))}
    </div>
  );
}
