import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { useTranslation } from "../i18n/react";
import { FURIGANA_WORD_MIN_PX } from "./balloonGeometry";
import { charCount } from "./subjectList";
import { SubjectWord } from "./SubjectWord";
import "./corner-print.css";

/** A word of four characters or more prints smaller, so the column stays short. */
const LONG_WORD_CHARS = 4;

/**
 * The sheet's two Kyoto Seika Subjects once Begin locked them in: a vertical margin note in non-repro
 * blue, as on a manga page's margin, under the ink. The canvas's name says the pair to screen readers.
 */
export function CornerPrint({
  subjects,
}: {
  subjects: readonly [KyotoSeikaSubject, KyotoSeikaSubject];
}) {
  const { t } = useTranslation();
  return (
    <div className="corner-print" aria-hidden="true">
      <span className="corner-print__heading" lang="ja">
        {t(($) => $.kyotoSeika.print.heading)}
      </span>
      {subjects.map((subject) => (
        <span key={subject.ja} className="corner-print__subject">
          <span
            className="corner-print__word"
            style={
              charCount(subject.ja) >= LONG_WORD_CHARS
                ? { fontSize: FURIGANA_WORD_MIN_PX }
                : undefined
            }
          >
            <SubjectWord subject={subject} />
          </span>
          <span className="corner-print__english" lang="en">
            {subject.en}
          </span>
        </span>
      ))}
    </div>
  );
}
