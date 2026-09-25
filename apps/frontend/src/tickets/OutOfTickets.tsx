import { useState } from "react";
import { IS_MOCK_PAYMENT, payForTickets } from "../payments/sui";
import { Ticket as TicketIcon } from "@phosphor-icons/react";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { TICKET_PACK } from "./config";
import "../styles/result-card.css";
import "./tickets.css";

type Step = "out" | "approve" | "paying" | "done" | "error";

interface Props {
  refillAt: Date;
  onTicketsBought: (n: number) => void;
  onStartDrawing: () => void;
  onBoard: () => void;
}

const clock = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

/** A paper ticket: outlined when used up, yellow when fresh. */
function Ticket({ filled, tilt }: { filled: boolean; tilt: number }) {
  return (
    <svg
      className={`ticket ${filled ? "filled" : ""}`}
      viewBox="0 0 104 64"
      style={{ rotate: `${tilt}deg` }}
      aria-hidden
    >
      <path d="M6 4h92a2 2 0 0 1 2 2v18a8 8 0 0 0 0 16v18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V40a8 8 0 0 0 0-16V6a2 2 0 0 1 2-2Z" />
      <line x1="34" y1="10" x2="34" y2="54" />
    </svg>
  );
}

export function OutOfTickets({ refillAt, onTicketsBought, onStartDrawing, onBoard }: Props) {
  const [step, setStep] = useState<Step>("out");
  const [digest, setDigest] = useState("");
  const [error, setError] = useState("");

  const pay = async () => {
    setStep("paying");
    try {
      const result = await payForTickets(TICKET_PACK.priceSui);
      setDigest(result.digest);
      onTicketsBought(TICKET_PACK.tickets);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Payment failed");
      setStep("error");
    }
  };

  const tickets = (filled: boolean) => (
    <div className="ticket-row">
      <Ticket filled={filled} tilt={-4} />
      <Ticket filled={filled} tilt={1} />
      <Ticket filled={filled} tilt={3} />
      {!filled && <span className="refill-badge">{clock(refillAt)}</span>}
    </div>
  );

  return (
    <div className="result-backdrop">
      <div className="result-card tickets-card" role="dialog" aria-label="Out of tickets">
        {step === "out" && (
          <>
            {tickets(false)}
            <h2 className="card-title">Out of tickets for today</h2>
            <p className="card-sub">
              Everyone gets 3 drawing tickets a day.
              <br />
              Yours refill at {clock(refillAt)}.
            </p>
            <div className="perforation" />
            <button className="keep-btn" onClick={() => setStep("approve")}>
              <TicketIcon size={20} /> Get more tickets with Sui
            </button>
            <button className="board-btn" onClick={onBoard}>
              <StickerBoardIcon size={18} /> Go to sticker board
            </button>
          </>
        )}

        {(step === "approve" || step === "paying") && (
          <>
            <div className="wallet-head">
              <span className="sui-mark" aria-hidden>
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path
                    d="M12 2.5c3 3.6 6.5 7.4 6.5 11.4a6.5 6.5 0 0 1-13 0C5.5 9.9 9 6.1 12 2.5Z"
                    fill="#fff"
                  />
                </svg>
              </span>
              <div>
                <b>Approve payment</b>
                <div className="muted small">
                  {IS_MOCK_PAYMENT ? "Mock wallet · no real SUI is sent" : "Sui wallet"}
                </div>
              </div>
            </div>
            <dl className="pay-rows">
              <div>
                <dt>You pay</dt>
                <dd>{TICKET_PACK.priceSui} SUI</dd>
              </div>
              <div>
                <dt>You get</dt>
                <dd>{TICKET_PACK.tickets} drawing tickets</dd>
              </div>
              <div>
                <dt>Network</dt>
                <dd>Sui {IS_MOCK_PAYMENT ? "(mock)" : ""}</dd>
              </div>
            </dl>
            <div className="perforation" />
            <button className="keep-btn" onClick={pay} disabled={step === "paying"}>
              {step === "paying" ? (
                <>
                  <span className="spinner" /> Confirming on Sui…
                </>
              ) : (
                <>Approve {TICKET_PACK.priceSui} SUI</>
              )}
            </button>
            <button
              className="board-btn"
              onClick={() => setStep("out")}
              disabled={step === "paying"}
            >
              Cancel
            </button>
          </>
        )}

        {step === "done" && (
          <>
            {tickets(true)}
            <h2 className="card-title">{TICKET_PACK.tickets} tickets added</h2>
            <p className="card-sub">
              Paid {TICKET_PACK.priceSui} SUI
              <br />
              <span className="digest">
                tx {digest.slice(0, 6)}…{digest.slice(-4)}
              </span>
            </p>
            <div className="perforation" />
            <button className="keep-btn" onClick={onStartDrawing}>
              Start drawing
            </button>
          </>
        )}

        {step === "error" && (
          <>
            <h2 className="card-title">Payment didn’t go through</h2>
            <p className="card-sub">{error}</p>
            <div className="perforation" />
            <button className="keep-btn" onClick={pay}>
              Try again
            </button>
            <button className="board-btn" onClick={() => setStep("out")}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
