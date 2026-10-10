import { useEffect, useState } from "react";
import { useTranslation } from "../../i18n/react";
import "./SealingStatusLabel.css";

/** It sticks on only if sealing takes more than a moment, so a quick seal never flashes it. */
export const SHOW_AFTER_MS = 1_000;
/** Then it says how long sealing can take, and later that it's taking longer than that. */
export const TAKES_A_WHILE_MS = 10_000;
export const TAKING_LONGER_MS = 30_000;

type Stage = "sealing" | "takesAWhile" | "takingLonger";

interface Props {
  /** A seal is on its way to the server. */
  waiting: boolean;
}

/**
 * The white label at the foot of the drawing screen while a seal is on its way: "Sealing your
 * sticker…", and, as the wait goes on, how long it can take. Each new line comes on a fresh label
 * pressed over the last; when the seal lands or fails, it peels off. Screen readers hear each line
 * from a status line that stays put.
 */
export function SealingStatusLabel({ waiting }: Props) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage | null>(null);
  // A new wait starts from nothing, even if the last one's label is still peeling off.
  const [wasWaiting, setWasWaiting] = useState(waiting);
  if (waiting !== wasWaiting) {
    setWasWaiting(waiting);
    if (waiting) setStage(null);
  }

  useEffect(() => {
    if (!waiting) return;
    const at = (ms: number, next: Stage) => setTimeout(() => setStage(next), ms);
    const timers = [
      at(SHOW_AFTER_MS, "sealing"),
      at(TAKES_A_WHILE_MS, "takesAWhile"),
      at(TAKING_LONGER_MS, "takingLonger"),
    ];
    return () => timers.forEach(clearTimeout);
  }, [waiting]);

  const line = t(($) => $.stickerCreation.sealCeremony.sealing);
  const note =
    stage === "takesAWhile"
      ? t(($) => $.stickerCreation.sealCeremony.takesAWhile)
      : stage === "takingLonger"
        ? t(($) => $.stickerCreation.sealCeremony.takingLonger)
        : null;
  const peeling = !waiting && stage !== null;
  const classes = [
    "sealing-status",
    stage !== "sealing" && "is-restuck",
    peeling && "is-peeling",
  ].filter(Boolean);

  return (
    <>
      <p className="visually-hidden" role="status">
        {waiting && stage ? [line, note].filter(Boolean).join(" ") : ""}
      </p>
      {stage && (
        <p
          key={stage}
          className={classes.join(" ")}
          aria-hidden="true"
          onAnimationEnd={(e) => {
            if (e.animationName === "sealing-status-peel") setStage(null);
          }}
        >
          <span className="sealing-status__line">{line}</span>
          {note && <span className="sealing-status__note">{note}</span>}
        </p>
      )}
    </>
  );
}
