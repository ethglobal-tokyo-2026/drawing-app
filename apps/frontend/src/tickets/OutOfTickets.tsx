import { useEffect, useState } from "react";
import { IS_MOCK_PAYMENT, payForTickets } from "../payments/sui";
import { Key, Label, QuietLink } from "../controls/controls";
import { DrawIcon } from "../icons/DrawIcon";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { TicketIcon } from "../icons/TicketIcon";
import { FREE_TICKETS_PER_DAY, TICKET_PACK } from "./config";
import { TicketStubs } from "./TicketStubs";
import "../styles/result-card.css";
import "./tickets.css";

type Step = "out" | "approve" | "paying" | "done" | "error";

interface Props {
  refillAt: Date;
  onTicketsBought: (n: number) => void;
  onStartDrawing: () => void;
  onBoard: () => void;
}

const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** "in 6h 56m", rounded up so it never reads "in 0m" before the refill. */
function countdown(to: Date, now: Date) {
  const minutes = Math.max(1, Math.ceil((to.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `in ${h}h ${m}m` : `in ${m}m`;
}

/** A printed refill line, never the timer dot's look. */
function RefillLine({ refillAt }: { refillAt: Date }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="refill-line">
      <b>New tickets at {clock(refillAt)},</b> <span>{countdown(refillAt, now)}</span>
    </p>
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

  return (
    <div className="result-backdrop">
      <div className="result-card" role="dialog" aria-label="Out of tickets">
        {step === "out" && (
          <>
            <TicketStubs used={FREE_TICKETS_PER_DAY} large />
            <h2 className="card-title">Out of tickets for today</h2>
            <RefillLine refillAt={refillAt} />
            <div className="perforation" />
            <Key icon={<TicketIcon size={20} />} onPress={() => setStep("approve")}>
              Get more tickets with Sui
            </Key>
            <Label icon={<StickerBoardIcon size={20} />} onPress={onBoard}>
              Go to sticker board
            </Label>
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
                  {IS_MOCK_PAYMENT ? "Mock payment · no real SUI is sent" : "Pay with Sui"}
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
            <Key
              onPress={() => void pay()}
              disabled={step === "paying"}
              icon={step === "paying" && <span className="spinner" />}
            >
              {step === "paying" ? "Confirming on Sui…" : `Approve ${TICKET_PACK.priceSui} SUI`}
            </Key>
            <QuietLink onPress={() => setStep("out")} disabled={step === "paying"}>
              Cancel
            </QuietLink>
          </>
        )}

        {step === "done" && (
          <>
            <TicketStubs used={0} filled large />
            <h2 className="card-title">{TICKET_PACK.tickets} tickets added</h2>
            <p className="card-sub">
              Paid {TICKET_PACK.priceSui} SUI
              <br />
              <span className="fine">
                tx {digest.slice(0, 6)}…{digest.slice(-4)}
              </span>
            </p>
            <div className="perforation" />
            <Key icon={<DrawIcon size={20} />} onPress={onStartDrawing}>
              Start drawing
            </Key>
          </>
        )}

        {step === "error" && (
          <>
            <h2 className="card-title">Payment didn’t go through</h2>
            <p className="card-sub">{error}</p>
            <div className="perforation" />
            <Key onPress={() => void pay()}>Try again</Key>
            <QuietLink onPress={() => setStep("out")}>Back</QuietLink>
          </>
        )}
      </div>
    </div>
  );
}
