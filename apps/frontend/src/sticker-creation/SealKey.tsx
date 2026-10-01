import { CheckFat } from "../icons";
import { useState } from "react";
import { useTranslation } from "../i18n/react";
import { ErrorDetail } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import "./SealKey.css";

interface Props {
  /** There's ink to seal. */
  shown: boolean;
  armed: boolean;
  /** The 18+ switch is on: the second tap seals the sticker as 18+, and the chip says so. */
  nsfw: boolean;
  /** What went wrong with the last seal, until the next tap. */
  problem: string | null;
  /** The words behind the problem, shown under it for a report with Copy, as every error line does. */
  detail?: string | null;
  /** How the key works, said for a moment on the first visits; a problem or the armed prompt takes its place. */
  hint: string | null;
  onTap: () => void;
}

/**
 * The seal check: the screen's one key, a round one. It springs in once there's ink. The first tap
 * arms it and a chip asks for the second, which seals.
 */
export function SealKey({ shown, armed, nsfw, problem, detail, hint, onTap }: Props) {
  const { t } = useTranslation();
  const prompt = t(($) => $.stickerCreation.seal.tapAgain);
  const tapAgain = nsfw ? t(($) => $.stickerCreation.seal.tapAgainNsfw) : prompt;
  const chip = armed ? tapAgain : (problem ?? hint);
  const chipDetail = !armed && problem ? (detail ?? null) : null;
  // The chip keeps what it said while it fades out.
  const [said, setSaid] = useState({ words: chip, detail: chipDetail });
  if (chip && (chip !== said.words || chipDetail !== said.detail))
    setSaid({ words: chip, detail: chipDetail });
  return (
    <>
      <div
        className={`seal-chip keep-phrases ${chip ? "is-on" : ""} ${said.words !== prompt ? "is-long" : ""}`}
      >
        <span role="status">{said.words}</span>
        {said.detail && <ErrorDetail text={said.detail} />}
      </div>
      <Key
        size="round"
        className={`seal-key ${shown ? "is-shown" : ""} ${armed ? "is-armed" : ""}`}
        style={{ "--size": "58px" }}
        icon={<CheckFat weight="fill" />}
        aria-label={armed ? tapAgain : t(($) => $.stickerCreation.seal.label)}
        onClick={onTap}
      />
    </>
  );
}
