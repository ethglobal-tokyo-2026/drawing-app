import { CheckFat } from "../icons";
import { useState } from "react";
import { useTranslation } from "../i18n/react";
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
  onTap: () => void;
}

/**
 * The seal check: the screen's one key, a round one. It springs in once there's ink. The first tap
 * arms it and a chip asks for the second, which seals.
 */
export function SealKey({ shown, armed, nsfw, problem, onTap }: Props) {
  const { t } = useTranslation();
  const tapAgain = nsfw
    ? t(($) => $.stickerCreation.seal.tapAgainNsfw)
    : t(($) => $.stickerCreation.seal.tapAgain);
  const chip = armed ? tapAgain : problem;
  // The chip keeps its words while it fades out.
  const [words, setWords] = useState(chip);
  if (chip && chip !== words) setWords(chip);
  return (
    <>
      <span
        className={`seal-chip ${chip ? "is-on" : ""} ${words === problem ? "is-problem" : ""}`}
        role="status"
      >
        {words}
      </span>
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
