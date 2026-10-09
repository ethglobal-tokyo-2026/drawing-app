import { useTranslation } from "../../i18n/react";
import { PEN_PRESSURES } from "../../sticker-creation/canvas/brush";
import { INPUT_MODES } from "../../sticker-creation/canvas/inkEngine";
import {
  keepInputMode,
  keepPenPressure,
  useInputMode,
  usePenPressure,
} from "../../sticker-creation/drawingSettings";
import { ChoiceRow } from "./ChoiceRow";
import { TryPenPressure } from "./TryPenPressure";
import "./pencil-settings.css";

/**
 * The Drawing group's Pencil rows, once a pen has drawn on this device: the input each new drawing
 * starts in, and how the pen's pressure sets its width, with a strip to try it. Each applies at once,
 * and `onKept` hands the group whether the device kept it, for its status and error lines.
 */
export function PencilSettings({ onKept }: { onKept: (kept: boolean) => void }) {
  const { t } = useTranslation();
  const inputMode = useInputMode();
  const pressure = usePenPressure();
  // No pen draws on a phone, so a phone shows none of this.
  if (inputMode === null) return null;
  return (
    <>
      <ChoiceRow
        label={t(($) => $.stickerBoard.settings.pencil.input.title)}
        choices={INPUT_MODES}
        value={inputMode}
        nameOf={(mode) => t(($) => $.stickerBoard.settings.pencil.input[mode])}
        onChoose={(mode) => onKept(keepInputMode(mode))}
      />
      <ChoiceRow
        label={t(($) => $.stickerBoard.settings.pencil.pressure.title)}
        choices={PEN_PRESSURES}
        value={pressure}
        nameOf={(each) => t(($) => $.stickerBoard.settings.pencil.pressure[each])}
        onChoose={(each) => onKept(keepPenPressure(each))}
      />
      <TryPenPressure response={pressure} fingersDraw={inputMode === "pencilAndFinger"} />
    </>
  );
}
