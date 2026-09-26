import { useEffect, useId, useRef } from "react";
import type { ApiError } from "../api/apiClient";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { Key } from "../ui/Key";
import { QuietLink } from "../ui/QuietLink";
import { TearLine } from "../ui/TearLine";
import { useFocusTrap } from "../ui/useFocusTrap";
import "./tickets.css";

interface Props {
  /** Null while they're still loading. */
  error: ApiError | null;
  onRetry: () => void;
  onBoard: () => void;
}

/** In the start card's place until your tickets load, or saying why they didn't. */
export function TicketsNotLoaded({ error, onRetry, onBoard }: Props) {
  const card = useRef<HTMLElement>(null);
  const id = useId();
  useFocusTrap(card, { onEscape: onBoard });

  useEffect(() => {
    const first = card.current?.querySelector<HTMLElement>("button:not(:disabled)");
    (first ?? card.current)?.focus();
  }, [error]);

  return (
    <div className="out-of-tickets">
      <div className="out-of-tickets__scrim" />
      <section
        ref={card}
        className="out-of-tickets__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-busy={!error}
        tabIndex={-1}
      >
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          {error ? "Couldn’t load your tickets" : "Checking your tickets…"}
        </h2>
        {error && (
          <p className="out-of-tickets__line" role="alert">
            <strong>{error.message}</strong>
          </p>
        )}
        <TearLine />
        {error ? (
          <Key className="out-of-tickets__key" onClick={onRetry}>
            Try again
          </Key>
        ) : (
          <Key className="out-of-tickets__key" icon={<StickerBoardIcon />} onClick={onBoard}>
            Go to sticker board
          </Key>
        )}
        {error && (
          <QuietLink className="out-of-tickets__quiet-link" onClick={onBoard}>
            Not now
          </QuietLink>
        )}
      </section>
    </div>
  );
}
