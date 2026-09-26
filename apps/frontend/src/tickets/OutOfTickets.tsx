import { Ticket } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { DrawIcon } from "../icons/DrawIcon";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { IS_MOCK_PAYMENT, payForTickets } from "../payments/sui";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { TearLine } from "../ui/TearLine";
import { useFocusTrap } from "../ui/useFocusTrap";
import { TICKET_PACK } from "./config";
import { formatRefillIn, formatRefillTime, msUntilRefillLineChanges } from "./refill";
import { TicketStubs } from "./TicketStubs";
import { ticketsLeft } from "./tickets";
import { useDailyTicketStubs } from "./useTicketStubs";
import { pickUpRefill, useTicketState } from "./useTickets";
import "./tickets.css";

type Step = "out" | "approve" | "paying" | "done" | "error";

interface Props {
  /** When the day's free tickets come back. */
  refillAt: Date;
  /** A purchase went through: the host adds the tickets and keeps the card up until the next choice. */
  onTicketsBought: (n: number) => void;
  /** Draw, once there are tickets again. */
  onStartDrawing: () => void;
  /** The free way out, and what Escape does. */
  onBoard: () => void;
}

/** Counts down to the refill the card opened with, waking only when the refill line would change. */
function useRefillCountdown(refillAt: Date) {
  const [at] = useState(refillAt);
  const [now, setNow] = useState(() => Date.now());
  const msLeft = at.getTime() - now;
  useEffect(() => {
    if (msLeft <= 0) return;
    const id = setTimeout(() => setNow(Date.now()), msUntilRefillLineChanges(msLeft));
    return () => clearTimeout(id);
  }, [msLeft]);
  return { at, msLeft };
}

const packStubs = Array.from({ length: TICKET_PACK.tickets }, () => ({ used: false }));

/**
 * Out of tickets: the day's used stubs, when new ones arrive, and the ways on. The free path leads:
 * the key goes to the sticker board and buying with Sui is label stock under it. If tickets come back
 * while it's open, it turns over in place and the key becomes Draw.
 */
export function OutOfTickets({ refillAt, onTicketsBought, onStartDrawing, onBoard }: Props) {
  const [step, setStep] = useState<Step>("out");
  const [error, setError] = useState("");
  const { at, msLeft } = useRefillCountdown(refillAt);
  const state = useTicketState();
  const stubs = useDailyTicketStubs(state);
  const card = useRef<HTMLElement>(null);
  const id = useId();
  const refilled = step === "out" && ticketsLeft(state) > 0;
  const view = refilled ? "refilled" : step;

  const pay = async () => {
    setStep("paying");
    try {
      await payForTickets(TICKET_PACK.priceSui);
      onTicketsBought(TICKET_PACK.tickets);
      setStep("done");
    } catch (e) {
      console.error("Buying tickets with Sui failed", e);
      setError(
        e instanceof Error && e.message ? e.message : "The payment stopped before it finished.",
      );
      setStep("error");
    }
  };

  // Once the card has turned over, leaving it takes the refill along, so the host sees the new tickets.
  const toBoard = refilled
    ? () => {
        pickUpRefill();
        onBoard();
      }
    : onBoard;

  const onEscape: Record<Step, (() => void) | null> = {
    out: toBoard,
    approve: () => setStep("out"),
    paying: null,
    done: onBoard,
    error: () => setStep("out"),
  };
  useFocusTrap(card, { onEscape: () => onEscape[step]?.() });

  // Each view's first control takes focus, so focus never drops out of the card when its controls change.
  useEffect(() => {
    const first = card.current?.querySelector<HTMLElement>("button:not(:disabled)");
    (first ?? card.current)?.focus();
  }, [view]);

  return (
    <div className="out-of-tickets">
      <div className="out-of-tickets__scrim" />
      <section
        ref={card}
        className="out-of-tickets__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={view === "out" ? `${id}-line` : undefined}
        aria-busy={step === "paying"}
        tabIndex={-1}
      >
        {/* One title element for both, so screen readers hear it turn over. */}
        {(view === "out" || view === "refilled") && (
          <>
            <TicketStubs className="out-of-tickets__art" size="large" stubs={stubs} />
            <h2 className="out-of-tickets__title" id={`${id}-title`} aria-live="polite">
              {refilled ? "New tickets are here" : "Out of tickets for today"}
            </h2>
            {!refilled && (
              <p className="out-of-tickets__line" id={`${id}-line`}>
                <strong>New tickets at {formatRefillTime(at)},</strong>{" "}
                <span className="out-of-tickets__quiet out-of-tickets__countdown">
                  {formatRefillIn(msLeft)}
                </span>
              </p>
            )}
            <TearLine />
            {refilled ? (
              <Key
                className="out-of-tickets__key"
                icon={<DrawIcon />}
                onClick={() => {
                  pickUpRefill();
                  onStartDrawing();
                }}
              >
                Draw
              </Key>
            ) : (
              <Key className="out-of-tickets__key" icon={<StickerBoardIcon />} onClick={onBoard}>
                Go to sticker board
              </Key>
            )}
            {refilled ? (
              <LabelButton block icon={<StickerBoardIcon />} onClick={toBoard}>
                Go to sticker board
              </LabelButton>
            ) : (
              <LabelButton block icon={<Ticket />} onClick={() => setStep("approve")}>
                Get more tickets with Sui
              </LabelButton>
            )}
          </>
        )}

        {(view === "approve" || view === "paying") && (
          <>
            <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
              {TICKET_PACK.tickets} more drawing tickets
            </h2>
            <p className="out-of-tickets__line">
              <strong>For {TICKET_PACK.priceSui} SUI.</strong>{" "}
              <span className="out-of-tickets__quiet">Bought tickets don’t expire.</span>
            </p>
            {IS_MOCK_PAYMENT && (
              <p className="out-of-tickets__note">Demo payment: no SUI is charged.</p>
            )}
            <TearLine />
            <Key
              className="out-of-tickets__key"
              icon={<Ticket />}
              disabled={view === "paying"}
              onClick={() => void pay()}
            >
              {view === "paying" ? "Paying with Sui…" : `Pay ${TICKET_PACK.priceSui} SUI`}
            </Key>
            <QuietLink
              className="out-of-tickets__quiet-link"
              disabled={view === "paying"}
              onClick={() => setStep("out")}
            >
              Not now
            </QuietLink>
          </>
        )}

        {view === "done" && (
          <>
            <TicketStubs className="out-of-tickets__art" size="large" stubs={packStubs} />
            <h2 className="out-of-tickets__title" id={`${id}-title`}>
              {TICKET_PACK.tickets} tickets added
            </h2>
            <p className="out-of-tickets__line out-of-tickets__quiet">
              {IS_MOCK_PAYMENT
                ? "Demo payment: no SUI was charged."
                : `Paid ${TICKET_PACK.priceSui} SUI.`}
            </p>
            <TearLine />
            <Key className="out-of-tickets__key" icon={<DrawIcon />} onClick={onStartDrawing}>
              Draw
            </Key>
            <LabelButton block icon={<StickerBoardIcon />} onClick={onBoard}>
              Go to sticker board
            </LabelButton>
          </>
        )}

        {view === "error" && (
          <>
            <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
              Payment didn’t go through
            </h2>
            <p className="out-of-tickets__line" role="alert">
              <strong>{error}</strong>{" "}
              <span className="out-of-tickets__quiet">No tickets were added.</span>
            </p>
            <TearLine />
            <Key className="out-of-tickets__key" icon={<Ticket />} onClick={() => void pay()}>
              Try again
            </Key>
            <QuietLink className="out-of-tickets__quiet-link" onClick={() => setStep("out")}>
              Not now
            </QuietLink>
          </>
        )}
      </section>
    </div>
  );
}
