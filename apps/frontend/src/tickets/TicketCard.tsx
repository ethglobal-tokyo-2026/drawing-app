import { useRef, type ReactNode } from "react";
import { useFocusTrap } from "../ui/useFocusTrap";
import "./tickets.css";

interface Props {
  /** The id of the card's title. */
  labelledBy: string;
  describedBy?: string;
  busy?: boolean;
  onEscape: () => void;
  /** The card's view: a new one puts focus on its first control. */
  refocus?: unknown;
  onScrimClick?: () => void;
  /** The card drops away: it takes no input and lets focus go, then `onLeft` follows its drop. */
  leaving?: boolean;
  onLeft?: () => void;
  /** Beside out-of-tickets on the wrapper. */
  className?: string;
  /** Beside out-of-tickets__card on the card. */
  cardClassName?: string;
  children: ReactNode;
}

/** The dialog every ticket card rises in: a scrim, and a card that holds focus while it's up. */
export function TicketCard({
  labelledBy,
  describedBy,
  busy,
  onEscape,
  refocus,
  onScrimClick,
  leaving = false,
  onLeft,
  className,
  cardClassName,
  children,
}: Props) {
  const card = useRef<HTMLElement>(null);
  useFocusTrap(card, { active: !leaving, onEscape, refocus });
  const classes = ["out-of-tickets", className, leaving && "is-leaving"];

  return (
    <div className={classes.filter(Boolean).join(" ")} inert={leaving}>
      <div className="out-of-tickets__scrim" aria-hidden="true" onClick={onScrimClick} />
      <section
        ref={card}
        className={["out-of-tickets__card", cardClassName].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-busy={busy}
        tabIndex={-1}
        onAnimationEnd={(e) => {
          if (leaving && e.target === e.currentTarget && e.animationName === "out-of-tickets-drop")
            onLeft?.();
        }}
      >
        {children}
      </section>
    </div>
  );
}
