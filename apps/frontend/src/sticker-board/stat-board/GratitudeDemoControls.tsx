import { Heart } from "@phosphor-icons/react";
import { useId, useState } from "react";
import {
  readMiniGameDemoSettings,
  saveMiniGameDemoSettings,
  type MiniGameDemoSettings,
} from "../../gratitude/miniGameDemoSettings";
import { useTranslation } from "../../i18n/react";
import { LabelButton } from "../../ui/LabelButton";
import "./gratitude-demo-controls.css";

interface Props {
  /** Opens the gratitude mini-game for the newest sticker; null while the board has none. */
  onTry: (() => void) | null;
}

/** The gratitude mini-game's demo entry, on the stat board's developer slip. */
export function GratitudeDemoControls({ onTry }: Props) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(readMiniGameDemoSettings);
  const id = useId();

  const change = (next: MiniGameDemoSettings) => {
    setSettings(next);
    saveMiniGameDemoSettings(next);
  };

  return (
    <div className="gratitude-demo">
      <h3 className="fine gratitude-demo__h">
        {t(($) => $.stickerBoard.developer.gratitudeDemo.title)}
      </h3>
      <LabelButton
        block
        icon={<Heart />}
        disabled={!onTry}
        aria-describedby={onTry ? undefined : `${id}-note`}
        onClick={onTry ?? undefined}
      >
        {t(($) => $.stickerBoard.developer.gratitudeDemo.try)}
      </LabelButton>
      {!onTry && (
        <p id={`${id}-note`} className="fine gratitude-demo__note">
          {t(($) => $.stickerBoard.developer.gratitudeDemo.drawFirst)}
        </p>
      )}
      <label className="gratitude-demo__switch">
        <input
          type="checkbox"
          checked={settings.fullEffects}
          onChange={(e) => change({ ...settings, fullEffects: e.target.checked })}
        />
        {t(($) => $.stickerBoard.developer.gratitudeDemo.fullEffects)}
      </label>
      <label className="gratitude-demo__switch">
        <input
          type="checkbox"
          checked={settings.showFrameTimes}
          onChange={(e) => change({ ...settings, showFrameTimes: e.target.checked })}
        />
        {t(($) => $.stickerBoard.developer.gratitudeDemo.showFrameTimes)}
      </label>
    </div>
  );
}
