import { useTranslation } from "../i18n/react";
import "./NsfwToggle.css";

interface Props {
  /** There's ink to seal, as the seal key shows. */
  shown: boolean;
  on: boolean;
  onChange: (on: boolean) => void;
}

/**
 * The 18+ switch over the seal key, for someone with the NSFW opt-in: on, the sticker seals as an
 * NSFW sticker. It's set while drawing, since sealing starts on the key's second tap and at time-up.
 */
export function NsfwToggle({ shown, on, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={t(($) => $.stickerCreation.nsfw.label)}
      className={`nsfw-toggle ${shown ? "is-shown" : ""} ${on ? "is-on" : ""}`}
      tabIndex={shown ? 0 : -1}
      onClick={() => onChange(!on)}
    >
      {t(($) => $.stickerCreation.nsfw.mark)}
    </button>
  );
}
