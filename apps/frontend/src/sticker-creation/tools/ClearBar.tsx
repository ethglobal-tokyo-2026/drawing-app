import { useEffect, useId, useRef } from "react";
import { useTranslation } from "../../i18n/react";
import { LabelButton } from "../../ui/LabelButton";
import { QuietLink } from "../../ui/QuietLink";
import "./panel-bar.css";
import "./ClearBar.css";

interface Props {
  id: string;
  open: boolean;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Asks before the sheet is cleared, from under the tool strip, where the smoothing bar opens. It isn't
 * modal: a tap anywhere else closes it, as it closes the other panels. Focus starts on Cancel, so
 * Enter alone never clears, and goes back to the clear tile when the bar closes with focus inside.
 */
export function ClearBar({ id, open, onClear, onClose }: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const lineId = useId();
  const bar = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const box = bar.current;
    if (!open || !box) return;
    cancel.current?.focus({ preventScroll: true });
    return () => {
      // A clear has already sent focus to Undo; closing any other way sends it back to the tile.
      if (box.contains(document.activeElement))
        document
          .querySelector<HTMLElement>(`[aria-controls="${id}"]`)
          ?.focus({ preventScroll: true });
    };
  }, [open, id]);

  return (
    <div
      ref={bar}
      id={id}
      className={`panel-bar under-tool-strip clear-bar keep-phrases ${open ? "is-open" : ""}`}
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={lineId}
    >
      <p className="clear-bar-title" id={titleId}>
        {t(($) => $.stickerCreation.clearBar.title)}
      </p>
      <p className="clear-bar-line" id={lineId}>
        {t(($) => $.stickerCreation.clearBar.line)}
      </p>
      <div className="clear-bar-actions">
        <QuietLink ref={cancel} onClick={onClose}>
          {t(($) => $.stickerCreation.clearBar.cancel)}
        </QuietLink>
        <LabelButton
          tone="tomato"
          size="sm"
          // Under reduced motion the press clicks as the finger lifts, before the browser focuses
          // the button it pressed; that focus would undo the clear's move to Undo.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
        >
          {t(($) => $.stickerCreation.clearBar.clear)}
        </LabelButton>
      </div>
    </div>
  );
}
