import { Key, QuietLink } from "../controls/controls";
import { DrawIcon } from "../icons/DrawIcon";
import { TicketStubs } from "./TicketStubs";
import "../styles/result-card.css";
import "./tickets.css";

interface Props {
  ticketsLeft: number;
  /** Free tickets used today, for the stubs. */
  usedToday: number;
  minutes: number;
  onStart: () => void;
  onBoard: () => void;
}

/** Asks before a ticket is spent: the clock only starts once the person says so. */
export function StartDrawing({ ticketsLeft, usedToday, minutes, onStart, onBoard }: Props) {
  return (
    <div className="result-backdrop">
      <div className="result-card" role="dialog" aria-label="Start drawing">
        <TicketStubs used={usedToday} large />
        <h2 className="card-title">Use a ticket to draw?</h2>
        <p className="card-sub">
          You have {ticketsLeft} ticket{ticketsLeft === 1 ? "" : "s"} left.
          <br />
          Your {minutes}-minute timer starts when you tap Start drawing.
        </p>
        <div className="perforation" />
        <Key icon={<DrawIcon size={20} />} onPress={onStart}>
          Start drawing
        </Key>
        <QuietLink onPress={onBoard}>Not now</QuietLink>
      </div>
    </div>
  );
}
