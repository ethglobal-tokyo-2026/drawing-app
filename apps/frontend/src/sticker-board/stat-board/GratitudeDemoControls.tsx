import { Heart } from "@phosphor-icons/react";
import { useId, useState } from "react";
import {
  readMiniGameDemoSettings,
  saveMiniGameDemoSettings,
  type MiniGameDemoSettings,
} from "../../gratitude/miniGameDemoSettings";
import { LabelButton } from "../../ui/LabelButton";
import "./gratitude-demo-controls.css";

interface Props {
  /** Opens the gratitude mini-game for the newest sticker; null while the board has none. */
  onTry: (() => void) | null;
}

/** The gratitude mini-game's demo entry, on the stat board's developer slip. */
export function GratitudeDemoControls({ onTry }: Props) {
  const [settings, setSettings] = useState(readMiniGameDemoSettings);
  const id = useId();

  const change = (next: MiniGameDemoSettings) => {
    setSettings(next);
    saveMiniGameDemoSettings(next);
  };

  return (
    <div className="gratitude-demo">
      <h3 className="fine gratitude-demo__h">Gratitude mini-game</h3>
      <LabelButton
        block
        icon={<Heart />}
        disabled={!onTry}
        aria-describedby={onTry ? undefined : `${id}-note`}
        onClick={onTry ?? undefined}
      >
        Try the gratitude mini-game
      </LabelButton>
      {!onTry && (
        <p id={`${id}-note`} className="fine gratitude-demo__note">
          Draw a sticker first
        </p>
      )}
      <label className="gratitude-demo__switch">
        <input
          type="checkbox"
          checked={settings.fullEffects}
          onChange={(e) => change({ ...settings, fullEffects: e.target.checked })}
        />
        Full effects
      </label>
      <label className="gratitude-demo__switch">
        <input
          type="checkbox"
          checked={settings.showFrameTimes}
          onChange={(e) => change({ ...settings, showFrameTimes: e.target.checked })}
        />
        Show frame times
      </label>
    </div>
  );
}
