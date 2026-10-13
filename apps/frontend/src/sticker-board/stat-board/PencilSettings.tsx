import { useId } from "react";
import { useTranslation } from "../../i18n/react";
import { PEN_PRESSURES } from "../../sticker-creation/canvas/brush";
import { INPUT_MODES } from "../../sticker-creation/canvas/inkEngine";
import {
  keepInputMode,
  keepPenMinimumWidth,
  keepPenPressure,
  useInputMode,
  usePenMinimumWidth,
  usePenPressure,
} from "../../sticker-creation/drawingSettings";
import { ChoiceRow } from "./ChoiceRow";
import { TryPenPressure } from "./TryPenPressure";
import "./pencil-settings.css";

/**
 * The Drawing group's Pencil rows, once a pen has drawn on this device: the input each new drawing
 * starts in, how the pen's pressure sets its width, and its minimum width, with a strip to try them.
 * Each applies at once, and `onKept` hands the group whether the device kept it, for its error line.
 */
export function PencilSettings({ onKept }: { onKept: (kept: boolean) => void }) {
  const { t } = useTranslation();
  const inputMode = useInputMode();
  const pressure = usePenPressure();
  const minimumWidth = usePenMinimumWidth();
  const minimumId = useId();
  const minimumValue = t(($) => $.stickerBoard.settings.pencil.minimumWidth.value, {
    percent: minimumWidth,
  });
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
      <div className="pen-minimum-width">
        <div className="settings-note__option">
          <label htmlFor={minimumId}>
            {t(($) => $.stickerBoard.settings.pencil.minimumWidth.title)}
          </label>
          <output htmlFor={minimumId} className="pen-minimum-width__value" aria-hidden="true">
            {minimumValue}
          </output>
        </div>
        <input
          id={minimumId}
          className="pen-minimum-width__range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={minimumWidth}
          disabled={pressure === "off"}
          aria-valuetext={minimumValue}
          aria-describedby={`${minimumId}-help`}
          style={{ "--p": `${minimumWidth}%` }}
          onInput={(event) => onKept(keepPenMinimumWidth(event.currentTarget.valueAsNumber))}
        />
        <p className="fine pen-minimum-width__help" id={`${minimumId}-help`}>
          {t(($) => $.stickerBoard.settings.pencil.minimumWidth.help)}
        </p>
      </div>
      <TryPenPressure
        response={pressure}
        fingersDraw={inputMode === "pencilAndFinger"}
        penMinimumWidth={minimumWidth}
      />
    </>
  );
}
