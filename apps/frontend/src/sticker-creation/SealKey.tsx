import { Check, CheckFat } from "../icons";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/react";
import { ErrorDetail } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import "./SealKey.css";

interface Props {
  /** There's ink to seal. */
  shown: boolean;
  armed: boolean;
  /** The sheet is marked 18+: the armed chip's box is ticked, and the seal marks the sticker. */
  nsfw: boolean;
  /** The armed chip's 18+ box was ticked or unticked. */
  onNsfwChange: (nsfw: boolean) => void;
  /** What went wrong with the last seal, until the next tap. */
  problem: string | null;
  /** The words behind the problem, shown under it for a report with Copy, as every error line does. */
  detail?: string | null;
  onTap: () => void;
}

/**
 * The seal check: the screen's one key, a round one. It springs in once there's ink. The first tap
 * arms it, and a chip asks for the second, which seals; the chip's box marks the sticker 18+ first.
 */
export function SealKey({ shown, armed, nsfw, onNsfwChange, problem, detail, onTap }: Props) {
  const { t } = useTranslation();
  const chipRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef<HTMLButtonElement>(null);
  const prompt = t(($) => $.stickerCreation.seal.tapAgain);
  const chip = armed ? prompt : problem;
  const chipDetail = !armed && problem ? (detail ?? null) : null;
  // The chip keeps what it said, and its box, while it fades out.
  const [said, setSaid] = useState({ words: chip, detail: chipDetail, armed });
  if (chip && (chip !== said.words || chipDetail !== said.detail || armed !== said.armed))
    setSaid({ words: chip, detail: chipDetail, armed });
  // The box goes with its chip: focus on it moves to the key, so a keyboard keeps its place.
  useLayoutEffect(() => {
    if (!armed && chipRef.current?.contains(document.activeElement))
      keyRef.current?.focus({ preventScroll: true });
  }, [armed]);
  return (
    <>
      <div
        ref={chipRef}
        className={`seal-chip keep-phrases ${chip ? "is-on" : ""} ${said.words !== prompt ? "is-long" : ""}`}
      >
        {said.armed && (
          <div className="seal-chip__row" aria-hidden={armed ? undefined : true}>
            <label className="seal-chip__nsfw">
              <span className="seal-chip__box">
                <input
                  type="checkbox"
                  checked={nsfw}
                  tabIndex={armed ? 0 : -1}
                  aria-label={t(($) => $.stickerCreation.nsfw.label)}
                  onChange={(e) => onNsfwChange(e.currentTarget.checked)}
                />
                <Check weight="bold" aria-hidden focusable="false" />
              </span>
              {/* The box's name starts with the same 18+, so screen readers hear it once. */}
              <span aria-hidden="true">{t(($) => $.stickerCreation.nsfw.mark)}</span>
            </label>
          </div>
        )}
        <span role="status">{said.words}</span>
        {said.detail && <ErrorDetail text={said.detail} />}
      </div>
      <Key
        ref={keyRef}
        size="round"
        className={`seal-key ${shown ? "is-shown" : ""} ${armed ? "is-armed" : ""}`}
        style={{ "--size": "58px" }}
        icon={<CheckFat weight="fill" />}
        aria-label={armed ? prompt : t(($) => $.stickerCreation.seal.label)}
        onClick={onTap}
      />
    </>
  );
}
