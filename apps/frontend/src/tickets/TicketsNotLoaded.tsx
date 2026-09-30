import { useId } from "react";
import type { ApiError } from "../api/apiClient";
import { errorDetail, errorMessage } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { ErrorDetail } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import { QuietLink } from "../ui/QuietLink";
import { TearLine } from "../ui/TearLine";
import { TicketCard } from "./TicketCard";
import "./tickets.css";

interface Props {
  /** Null while they're still loading. */
  error: ApiError | null;
  onRetry: () => void;
  onBoard: () => void;
}

/** In the start card's place until your tickets load, or saying why they didn't. */
export function TicketsNotLoaded({ error, onRetry, onBoard }: Props) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <TicketCard labelledBy={`${id}-title`} busy={!error} onEscape={onBoard} refocus={error}>
      <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
        {error ? t(($) => $.tickets.notLoaded.couldntLoad) : t(($) => $.tickets.notLoaded.checking)}
      </h2>
      {error && (
        <>
          <p className="out-of-tickets__line" role="alert">
            <strong>{errorMessage(error)}</strong>
          </p>
          <ErrorDetail text={errorDetail(error)} />
        </>
      )}
      <TearLine />
      {error ? (
        <Key className="out-of-tickets__key" onClick={onRetry}>
          {t(($) => $.tickets.tryAgain)}
        </Key>
      ) : (
        <Key className="out-of-tickets__key" icon={<StickerBoardIcon />} onClick={onBoard}>
          {t(($) => $.ui.backToBoard)}
        </Key>
      )}
      {error && (
        <QuietLink className="out-of-tickets__quiet-link" onClick={onBoard}>
          {t(($) => $.tickets.notNow)}
        </QuietLink>
      )}
    </TicketCard>
  );
}
