import { useRef, useState, type ReactNode, type RefObject } from "react";
import { useTranslation } from "../i18n/react";
import { useLargeScreen } from "./largeScreen";
import { useBackToClose } from "./useBackToClose";
import { useFocusTrap } from "./useFocusTrap";
import { useModalDialog } from "./useModalDialog";
import { useSheetDrag } from "./useSheetDrag";
import "./sheet.css";

interface Props {
  /** Names the sheet for assistive tech. */
  label: string;
  /**
   * For a sheet that stays mounted: closing slides it back down before it goes. A sheet whose parent
   * unmounts it leaves this out and simply goes.
   */
  open?: boolean;
  /** What the perforation, Escape and Back do. */
  onClose: () => void;
  /** Escape's own answer, where it steps back inside the sheet before it closes it. */
  onEscape?: () => void;
  /** Its act is on its way: the sheet stays up, and Back keeps its place so it can try again. */
  busy?: boolean;
  /**
   * False while there's nothing to go back to, as at 0:00 on the drawing screen: the sheet stays up,
   * its perforation is only plain holes, and Escape and Back do nothing.
   */
  closable?: boolean;
  /** Where focus goes once it closes, for a sheet that opens as another goes, so it never saw the opener. */
  returnFocus?: () => HTMLElement | null;
  /**
   * What stays live around the sheet while it's open, for a sheet in a layer of its own (with a scrim
   * to tap, or a screen that closes it). The rest of the page goes inert.
   */
  layer?: RefObject<HTMLElement | null>;
  /**
   * Its heading, over the rest. On a large screen a swipe down it drags the sheet as the perforation
   * does, for a sheet that shows there as a card without its tear strip.
   */
  head?: ReactNode;
  /** On a large screen it shows as a card in the middle of its layer (sheet.css's `.sheet-card`). */
  card?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * A modal bottom sheet on the Liner: the page behind it is inert and focus stays inside while it's
 * open, and Escape, Back and its perforation row (drag it down or tap it) close it, so no caller has
 * to remember them.
 */
export function Sheet({
  label,
  open = true,
  onClose,
  onEscape,
  busy = false,
  closable = true,
  returnFocus,
  layer,
  head,
  card = false,
  className,
  children,
}: Props) {
  const { t } = useTranslation();
  const large = useLargeScreen();
  const ref = useRef<HTMLDivElement>(null);
  // The perforation, Escape and Back all close it, and all refuse while its act is on its way.
  const stays = busy || !closable;
  const close = () => {
    if (!stays) onClose();
  };
  // A drag down the perforation, or on a large screen down its head, closes it.
  const drag = useSheetDrag(close);
  const [shown, setShown] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setShown(true);
      drag.reset();
    }
  }
  // The page comes back from inert before the trap gives focus back to it, so this goes first.
  useModalDialog(ref, { layer, active: open });
  useFocusTrap(ref, { active: open, onEscape: onEscape ?? close, returnFocus });
  useBackToClose(open, () => {
    close();
    return !stays;
  });
  if (!shown) return null;

  const leaving = !open;
  return (
    <div
      ref={ref}
      className={["bottom-sheet", card && "sheet-card", leaving && "is-leaving", className]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      aria-hidden={leaving || undefined}
      inert={leaving}
      style={drag.style}
      onAnimationEnd={(e) => {
        if (leaving && e.target === e.currentTarget) setShown(false);
      }}
    >
      {closable ? (
        <button
          type="button"
          className="perf"
          aria-label={t(($) => $.ui.sheet.close, { label })}
          aria-disabled={busy || undefined}
          {...drag.handlers}
          onClick={() => {
            if (!drag.tookClick()) close();
          }}
        />
      ) : (
        // Nothing to go back to: plain holes, with no grab, and no stop for Tab.
        <span className="perf perf--plain" aria-hidden="true" />
      )}
      {head !== undefined && (
        // A sheet that can't close has no grab here either, as its plain perforation has none.
        <div className="bottom-sheet__head" {...(large && closable ? drag.handlers : {})}>
          {head}
        </div>
      )}
      {children}
    </div>
  );
}
