import { useState } from "react";
import { useTranslation } from "../../i18n/react";
import {
  DRAWING_HANDS,
  keepDrawingHand,
  useDrawingHand,
  type DrawingHand,
} from "../../sticker-creation/drawingSettings";
import { ErrorLine } from "../../ui/ErrorLine";
import { ChoiceRow } from "./ChoiceRow";
import { PencilSettings } from "./PencilSettings";

/**
 * Settings' Drawing group: the drawing screen's settings, kept on this device rather than your
 * account, since each suits a device and the hand that draws on it. A change applies at once, and the
 * status line says it's kept; one the device couldn't keep says so and lasts until Croquis closes.
 * Once a pen has drawn on the device, the Pencil rows follow (`PencilSettings`).
 */
export function DrawingSettings() {
  const { t } = useTranslation();
  const hand = useDrawingHand();
  // Whether the device kept the last change; null until something changes.
  const [kept, setKept] = useState<boolean | null>(null);
  const handName = (each: DrawingHand) => t(($) => $.stickerBoard.settings.drawing.hand[each]);
  return (
    <fieldset className="settings-note__setting" data-setting="drawing">
      <legend className="fine settings-note__legend">
        {t(($) => $.stickerBoard.settings.drawing.title)}
      </legend>
      <ChoiceRow
        label={t(($) => $.stickerBoard.settings.drawing.hand.label)}
        choices={DRAWING_HANDS}
        value={hand}
        nameOf={handName}
        onChoose={(each) => setKept(keepDrawingHand(each))}
      />
      <PencilSettings onKept={setKept} />
      <p className="fine settings-note__status" role="status">
        {kept ? t(($) => $.stickerBoard.settings.drawing.kept) : ""}
      </p>
      {kept === false && (
        <ErrorLine className="settings-note__problem">
          {t(($) => $.stickerBoard.settings.drawing.notKept)}
        </ErrorLine>
      )}
    </fieldset>
  );
}
