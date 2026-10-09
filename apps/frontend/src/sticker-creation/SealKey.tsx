import { CheckFat } from "../icons";
import { useState } from "react";
import { useTranslation } from "../i18n/react";
import { ErrorDetail } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import "./SealKey.css";

interface Props {
  /** There's ink to seal. */
  shown: boolean;
  /** What went wrong with the last seal, until the next tap. */
  problem: string | null;
  /** The words behind the problem, shown under it for a report with Copy, as every error line does. */
  detail?: string | null;
  onTap: () => void;
}

/**
 * The seal check: the drawing screen's one key, a round one. It springs in once there's ink, and a
 * tap opens the seal sheet. A chip over it says what went wrong with the last seal.
 */
export function SealKey({ shown, problem, detail, onTap }: Props) {
  const { t } = useTranslation();
  const chipDetail = problem ? (detail ?? null) : null;
  // The chip keeps what it said while it fades out.
  const [said, setSaid] = useState({ words: problem, detail: chipDetail });
  if (problem && (problem !== said.words || chipDetail !== said.detail))
    setSaid({ words: problem, detail: chipDetail });
  return (
    <>
      <div className={`seal-chip keep-phrases ${problem ? "is-on" : ""}`}>
        <span role="status">{said.words}</span>
        {said.detail && <ErrorDetail text={said.detail} />}
      </div>
      <Key
        size="round"
        className={`seal-key ${shown ? "is-shown" : ""}`}
        style={{ "--size": "58px" }}
        icon={<CheckFat weight="fill" />}
        aria-label={t(($) => $.stickerCreation.seal.label)}
        onClick={onTap}
      />
    </>
  );
}
