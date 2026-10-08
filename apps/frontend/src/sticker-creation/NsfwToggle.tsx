import { useTranslation } from "../i18n/react";
import "./NsfwToggle.css";

interface Props {
  /** There's ink to seal, as the seal key shows. */
  shown: boolean;
  on: boolean;
  /** You have the NSFW opt-in, so you'll see the sticker unblurred. */
  optedIn: boolean;
  /** The seal key's chip has a problem or the hint up, tall enough to run into longer words. */
  brief: boolean;
  onChange: (on: boolean) => void;
}

/**
 * The 18+ switch over the seal key: on, the sticker seals as an NSFW sticker. It's set while drawing,
 * since sealing starts on the key's second tap and at time-up. Someone without the NSFW opt-in will
 * see the sticker blurred too, so for them its words say so.
 */
export function NsfwToggle({ shown, on, optedIn, brief, onChange }: Props) {
  const { t } = useTranslation();
  const words =
    on && !optedIn && !brief ? t(($) => $.stickerCreation.nsfw.markBlurredForYou) : null;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={
        optedIn
          ? t(($) => $.stickerCreation.nsfw.label)
          : t(($) => $.stickerCreation.nsfw.labelBlurredForYou)
      }
      className={`nsfw-toggle ${shown ? "is-shown" : ""} ${on ? "is-on" : ""}`}
      tabIndex={shown ? 0 : -1}
      onClick={() => onChange(!on)}
    >
      {words ?? t(($) => $.stickerCreation.nsfw.mark)}
    </button>
  );
}
