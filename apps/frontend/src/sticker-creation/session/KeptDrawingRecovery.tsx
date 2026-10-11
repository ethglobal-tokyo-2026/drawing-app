import { useState } from "react";
import { problemOf } from "../../i18n/errorMessage";
import { useTranslation } from "../../i18n/react";
import { ErrorDetail, ErrorLine } from "../../ui/ErrorLine";
import { Key } from "../../ui/Key";
import { LabelButton } from "../../ui/LabelButton";
import { Sheet } from "../../ui/Sheet";
import type { KeptSession } from "./keptSession";
import "./KeptDrawingRecovery.css";

export type RecoveryReconciliation =
  | { status: "checking" }
  | { status: "unknown" }
  | { status: "failed"; error: unknown; onRetry: () => void }
  | { status: "resolved"; outcome: "unsealed" | "sealed" };

interface Props {
  recovery: Extract<KeptSession, { status: "unverified" }>;
  reconciliation: RecoveryReconciliation;
  onRetry?: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

/** Readable ink with no proven ticket association stays available until explicitly discarded. */
export function KeptDrawingRecovery({
  recovery,
  reconciliation,
  onRetry,
  onDiscard,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const download = () => {
    if (!recovery.recovery) return;
    let url: string | undefined;
    const link = document.createElement("a");
    try {
      url = URL.createObjectURL(
        new Blob([JSON.stringify(recovery.recovery)], { type: "application/json" }),
      );
      link.href = url;
      link.download = "croquis-recovered-drawing.json";
      document.body.append(link);
      link.click();
      setDownloadError(null);
    } catch (error) {
      console.error("The recovered drawing could not be downloaded", error);
      setDownloadError(error);
    } finally {
      link.remove();
      // The browser must start the download before its URL is released.
      if (url) {
        const downloaded = url;
        setTimeout(() => URL.revokeObjectURL(downloaded), 0);
      }
    }
  };
  return (
    <Sheet
      className="kept-drawing-recovery"
      card
      scrim="always"
      label={t(($) => $.stickerCreation.recovery.title)}
      onClose={onClose}
      head={<h2>{t(($) => $.stickerCreation.recovery.title)}</h2>}
    >
      <p>
        {recovery.recovery
          ? t(($) => $.stickerCreation.recovery.explanation)
          : t(($) => $.stickerCreation.recovery.unread)}
      </p>
      {recovery.reason === "upgrade-failed" ? (
        <ErrorLine detail={problemOf(recovery.error).detail} onRetry={onRetry}>
          {t(($) => $.stickerCreation.recovery.upgradeFailed)}
        </ErrorLine>
      ) : recovery.reason === "metadata-unavailable" ? (
        <ErrorLine detail={problemOf(recovery.error).detail} onRetry={onRetry}>
          {t(($) => $.stickerCreation.recovery.metadataUnknown)}
        </ErrorLine>
      ) : (
        <ErrorDetail text={problemOf(recovery.error).detail} />
      )}
      {recovery.recovery && (
        <Key onClick={download}>{t(($) => $.stickerCreation.recovery.download)}</Key>
      )}
      {downloadError !== null && (
        <ErrorLine detail={problemOf(downloadError).detail} onRetry={download}>
          {t(($) => $.stickerCreation.recovery.downloadFailed)}
        </ErrorLine>
      )}
      {reconciliation.status === "checking" && (
        <p role="status">{t(($) => $.stickerCreation.recovery.checkingSeal)}</p>
      )}
      {reconciliation.status === "failed" && (
        <ErrorLine detail={problemOf(reconciliation.error).detail} onRetry={reconciliation.onRetry}>
          {t(($) => $.stickerCreation.recovery.sealUnresolved)}
        </ErrorLine>
      )}
      {reconciliation.status === "unknown" && recovery.ticket !== null && (
        <p>{t(($) => $.stickerCreation.recovery.oldTicketUnknown)}</p>
      )}
      <p>{t(($) => $.stickerCreation.recovery.discardExplanation)}</p>
      <LabelButton
        tone="tomato"
        disabled={reconciliation.status === "checking" || reconciliation.status === "failed"}
        onClick={onDiscard}
      >
        {recovery.ticket === null
          ? t(($) => $.stickerCreation.recovery.discardUnknown)
          : reconciliation.status === "unknown"
            ? t(($) => $.stickerCreation.recovery.abandon)
            : t(($) => $.stickerCreation.recovery.discard)}
      </LabelButton>
    </Sheet>
  );
}
