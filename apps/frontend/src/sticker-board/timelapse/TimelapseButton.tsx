import { ApiError } from "../../api/apiClient";
import { errorReason } from "../../i18n/errorMessage";
import { useTranslation } from "../../i18n/react";
import { Play, SkipForward } from "../../icons";
import { formatNo } from "../../stickers/format";
import { LabelButton } from "../../ui/LabelButton";
import { QuietLink } from "../../ui/QuietLink";
import type { Timelapse, TimelapsePhase } from "./useTimelapse";
import "./timelapse.css";

const LABELS = ["watch", "loading", "preparing", "skip"] as const;
type Label = (typeof LABELS)[number];
const LABEL_OF: Record<TimelapsePhase, Label> = {
  idle: "watch",
  loading: "loading",
  preparing: "preparing",
  playing: "skip",
  ending: "skip",
};

/**
 * Timelapse, at the end of the sticker's fine print: it plays how the sticker was drawn, and skips
 * to the end while it plays. A polite live line says when it plays and when it's done.
 */
export function TimelapseButton({ timelapse }: { timelapse: Timelapse }) {
  const { t } = useTranslation();
  const {
    sticker,
    phase,
    said,
    press,
    attach: { button: buttonRef },
  } = timelapse;
  if (!sticker) return null;
  const no = formatNo(sticker.no);
  const shown = LABEL_OF[phase];
  const busy = shown === "loading" || shown === "preparing";
  const text: Record<Label, string> = {
    watch: t(($) => $.stickerBoard.timelapse.watch),
    loading: t(($) => $.stickerBoard.timelapse.loading),
    preparing: t(($) => $.stickerBoard.timelapse.preparing),
    skip: t(($) => $.stickerBoard.timelapse.skip),
  };
  // Busy, it's named by what it's doing; aria-disabled rather than disabled keeps its focus.
  const name = busy
    ? undefined
    : shown === "skip"
      ? t(($) => $.stickerBoard.timelapse.skipLabel)
      : t(($) => $.stickerBoard.timelapse.watchLabel, { no });
  return (
    <>
      <LabelButton
        ref={buttonRef}
        size="sm"
        className="timelapse-button"
        icon={
          shown === "skip" ? <SkipForward size={18} aria-hidden /> : <Play size={18} aria-hidden />
        }
        aria-label={name}
        aria-disabled={busy || undefined}
        onClick={press}
      >
        {/* Every state's label in one cell, so the button keeps its width as they change. */}
        <span className="timelapse-button__labels">
          {LABELS.map((label) => (
            <span key={label} aria-hidden={label === shown ? undefined : true}>
              {text[label]}
            </span>
          ))}
        </span>
      </LabelButton>
      <span className="visually-hidden" role="status">
        {said === "playing"
          ? t(($) => $.stickerBoard.timelapse.playing, { no })
          : said === "done"
            ? t(($) => $.stickerBoard.timelapse.done)
            : ""}
      </span>
    </>
  );
}

/** Why the timelapse couldn't play, under the sticker's meta, with Try again. */
export function TimelapseFailure({ timelapse }: { timelapse: Timelapse }) {
  const { t } = useTranslation();
  const { failure, retry } = timelapse;
  if (!failure) return null;
  const reason =
    failure instanceof ApiError
      ? errorReason(failure)
      : t(($) => $.stickerBoard.timelapse.notPlayed, { detail: failure.message });
  return (
    <p className="fine timelapse-failed" role="alert">
      {t(($) => $.stickerBoard.timelapse.failed, { reason })}{" "}
      <QuietLink onClick={retry}>{t(($) => $.stickerBoard.tryAgain)}</QuietLink>
    </p>
  );
}
