import { useId, useState } from "react";
import { useTranslation } from "../../i18n/react";
import { AGE_STATUSES, isAgeStatus, type AgeStatus } from "../../identity/ageStatus";
import { readNsfwDemo, saveNsfwDemo } from "../../stickers/nsfwDemo";
import { LabelButton } from "../../ui/LabelButton";
import "./nsfw-demo-controls.css";

/** Sticker Nos. as typed: numbers split by commas or spaces, with or without "No." */
function parseNos(text: string): number[] | null {
  const parts = text
    .split(/[\s,]+/)
    .map((part) => part.replace(/^no\.?/i, ""))
    .filter(Boolean);
  const nos = parts.map(Number);
  return nos.every((no) => Number.isInteger(no) && no > 0) ? nos : null;
}

/**
 * The NSFW stickers demo, on the stat board's developer slip, until the API sends age status and NSFW
 * stickers: your age status, and which stickers count as NSFW in this window. Saving reloads, since
 * stickers take the flag as they load.
 */
export function NsfwDemoControls() {
  const { t } = useTranslation();
  const id = useId();
  const [settings] = useState(readNsfwDemo);
  const [age, setAge] = useState<AgeStatus | "demo">(settings.myAgeStatus ?? "demo");
  const [nos, setNos] = useState(settings.stickerNos.join(", "));
  const parsed = parseNos(nos);

  const save = () => {
    if (!parsed) return;
    saveNsfwDemo({ ...settings, myAgeStatus: age === "demo" ? null : age, stickerNos: parsed });
    location.reload();
  };

  return (
    <div className="nsfw-demo">
      <h3 className="fine nsfw-demo__h">{t(($) => $.stickerBoard.developer.nsfwDemo.title)}</h3>
      <label className="nsfw-demo__field">
        {t(($) => $.stickerBoard.developer.nsfwDemo.age)}
        <select
          value={age}
          onChange={(e) => {
            const value = e.target.value;
            setAge(isAgeStatus(value) ? value : "demo");
          }}
        >
          <option value="demo">{t(($) => $.stickerBoard.developer.nsfwDemo.ageDemo)}</option>
          {AGE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="nsfw-demo__field">
        {t(($) => $.stickerBoard.developer.nsfwDemo.nos)}
        <input
          type="text"
          inputMode="numeric"
          value={nos}
          placeholder="147, 152"
          aria-invalid={!parsed || undefined}
          aria-describedby={`${id}-nos`}
          onChange={(e) => setNos(e.target.value)}
        />
      </label>
      <p id={`${id}-nos`} className="fine nsfw-demo__note">
        {parsed
          ? t(($) => $.stickerBoard.developer.nsfwDemo.nosNote, {
              count: settings.stickerIds.length,
            })
          : t(($) => $.stickerBoard.developer.nsfwDemo.nosInvalid)}
      </p>
      <LabelButton block disabled={!parsed} onClick={save}>
        {t(($) => $.stickerBoard.developer.nsfwDemo.save)}
      </LabelButton>
    </div>
  );
}
