import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { useTranslation } from "../i18n/react";
import "./corner-print.css";

/**
 * The sheet's two Kyoto Seika Subjects once Begin locked them in: a faint margin note in non-repro
 * blue, as on a manga page's margin, under the ink. The canvas's name says the pair to screen readers.
 */
export function CornerPrint({
  subjects,
}: {
  subjects: readonly [KyotoSeikaSubject, KyotoSeikaSubject];
}) {
  const { t } = useTranslation();
  return (
    <div className="corner-print" aria-hidden="true" lang="ja">
      <span className="corner-print__heading">{t(($) => $.kyotoSeika.print.heading)}</span>
      {subjects.map((subject) => (
        <span key={subject.ja} className="corner-print__word">
          {subject.ja}
        </span>
      ))}
    </div>
  );
}
