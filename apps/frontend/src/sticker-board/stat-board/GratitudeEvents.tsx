import type { GratitudeEvents } from "@drawing-app/api/client";
import { useRef, useState } from "react";
import { apiError } from "../../api/apiClient";
import { useApi } from "../../api/useApi";
import { useApiQuery } from "../../api/useApiQuery";
import { toPerson, toSticker } from "../../api/views";
import { problemOf } from "../../i18n/errorMessage";
import { formatCount } from "../../i18n/format";
import { useTranslation } from "../../i18n/react";
import { GratitudeIcon } from "../../icons";
import { formatDay, handleOf } from "../../stickers/format";
import { ErrorLine } from "../../ui/ErrorLine";
import { QuietLink } from "../../ui/QuietLink";
import { Sheet } from "../../ui/Sheet";
import { Skeleton } from "../../ui/Skeleton";
import { PhonePortal } from "../../ui/PhonePortal";
import "./gratitude-events.css";

type GratitudeEvent = GratitudeEvents["events"][number];

/** How many outline rows stand in for the first page while it loads. */
const LOADING_ROWS = 3;

type Older = { step: "idle" } | { step: "loading" } | { step: "failed"; error: unknown };

/** One combo that gave you gratitude: its sticker, who sent it and when, and what it gave you. */
function EventRow({ event }: { event: GratitudeEvent }) {
  const { t } = useTranslation();
  const from = toPerson(event.from);
  return (
    <li className="gratitude-events__row">
      <img className="gratitude-events__sticker" src={toSticker(event.sticker).urls.png} alt="" />
      <span className="gratitude-events__who">
        <span className="gratitude-events__from">{handleOf(from)}</span>
        <span className="fine gratitude-events__when">
          <span>{formatDay(Date.parse(event.recordedAt))}</span>
          {event.part === "residual" && (
            <span>{t(($) => $.stickerBoard.statBoard.gratitude.events.residual)}</span>
          )}
        </span>
      </span>
      <span className="gratitude-events__amount">
        <GratitudeIcon className="gratitude-events__heart" size={14} />
        {formatCount(event.amount)}
      </span>
    </li>
  );
}

/**
 * Your gratitude events, opened from your receipt: every combo that gave you gratitude, newest first,
 * a page at a time. Held over the whole phone rather than inside the turned board.
 */
export function GratitudeEventsSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const first = useApiQuery("gratitude-events", (client) => client.gratitudeEvents());
  const [older, setOlder] = useState<GratitudeEvents[]>([]);
  const [olderStatus, setOlderStatus] = useState<Older>({ step: "idle" });
  const layer = useRef<HTMLDivElement>(null);
  const title = t(($) => $.stickerBoard.statBoard.gratitude.title);
  const pages = first.state === "ready" ? [first.data, ...older] : [];
  const next = pages.at(-1)?.next ?? null;

  const showMore = async () => {
    if (!next || olderStatus.step === "loading") return;
    setOlderStatus({ step: "loading" });
    try {
      const page = await api.gratitudeEvents(next);
      setOlder((shown) => [...shown, page]);
      setOlderStatus({ step: "idle" });
    } catch (error) {
      const failure = apiError(error);
      console.error("Your older gratitude events didn't load", failure);
      setOlderStatus({ step: "failed", error: failure });
    }
  };

  const didntLoad = (error: unknown, retry: () => void) => {
    const { message, detail } = problemOf(error);
    return (
      <ErrorLine detail={detail} onRetry={retry}>
        {t(($) => $.stickerBoard.statBoard.gratitude.events.didntLoad, { reason: message })}
      </ErrorLine>
    );
  };

  const sheet = (
    <div className="gratitude-events-layer" ref={layer}>
      <div className="gratitude-events__scrim" onClick={onClose} />
      <Sheet
        label={title}
        layer={layer}
        onClose={onClose}
        className="gratitude-events"
        card
        head={
          <h2 className="gratitude-events__title">
            <GratitudeIcon className="gratitude-events__heart" size={18} />
            {title}
          </h2>
        }
      >
        <p className="visually-hidden" role="status">
          {first.state === "loading" || olderStatus.step === "loading"
            ? t(($) => $.stickerBoard.statBoard.gratitude.events.loading)
            : ""}
        </p>
        {first.state === "loading" && (
          <ol className="gratitude-events__list" aria-hidden>
            {Array.from({ length: LOADING_ROWS }, (_, i) => (
              <li key={i} className="gratitude-events__row">
                <Skeleton width="44px" height="44px" />
                <Skeleton width="60%" height="1em" />
              </li>
            ))}
          </ol>
        )}
        {first.state === "failed" && didntLoad(first.error, first.retry)}
        {pages.length > 0 && (
          <ol className="gratitude-events__list">
            {pages
              .flatMap((page) => page.events)
              .map((event) => (
                <EventRow key={event.giftId} event={event} />
              ))}
          </ol>
        )}
        {olderStatus.step === "failed" && didntLoad(olderStatus.error, () => void showMore())}
        {next && olderStatus.step !== "failed" && (
          <QuietLink
            className="gratitude-events__more"
            aria-busy={olderStatus.step === "loading"}
            onClick={() => void showMore()}
          >
            {t(($) => $.stickerBoard.statBoard.gratitude.events.more)}
          </QuietLink>
        )}
      </Sheet>
    </div>
  );
  return <PhonePortal>{sheet}</PhonePortal>;
}
