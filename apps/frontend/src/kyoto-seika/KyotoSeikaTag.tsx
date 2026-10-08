import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { useTranslation } from "../i18n/react";
import { spokenSubject } from "./spokenSubject";
import { SubjectPair } from "./SubjectPair";
import "./kyoto-seika-tag.css";

/**
 * The tag on the detail of a sticker drawn in Kyoto Seika Practice Mode, beside Timelapse: an ink
 * label-tape tag with a tone swatch like its foil, and the pair it was drawn from, with their readings.
 */
export function KyotoSeikaTag({
  subjects,
}: {
  subjects: readonly [KyotoSeikaSubject, KyotoSeikaSubject];
}) {
  const { t } = useTranslation();
  const [first, second] = subjects;
  return (
    <p className="kyoto-seika-tag">
      <span className="kyoto-seika-tag__label" aria-hidden="true">
        {t(($) => $.kyotoSeika.tag.label)}
      </span>
      <SubjectPair subjects={subjects} />
      <span className="visually-hidden">
        {t(($) => $.kyotoSeika.tag.spoken, {
          first: spokenSubject(first),
          second: spokenSubject(second),
        })}
      </span>
    </p>
  );
}
