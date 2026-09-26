import { ArrowUUpLeft, SignOut } from "@phosphor-icons/react";
import {
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
} from "react";
import type { StickerGiftStatus } from "../../giving/giftStore";
import { retryPrivySignIn, usePrivyStatus, type PrivyStatus } from "../../identity/privy";
import { PrivyAccount } from "../../identity/PrivyAccount";
import { firstSeen } from "../../identity/profile";
import { useIdentity } from "../../identity/useIdentity";
import { LineDetails } from "../../line/LineDetails";
import { lineLogout } from "../../line/liff";
import { SendTestMessage } from "../../line/SendTestMessage";
import { formatDay, formatHandle } from "../../stickers/format";
import type { StickerRecord } from "../../stickers/stickerStorage";
import { formatRefillTime } from "../../tickets/refill";
import { nextRefill, ticketDay } from "../../tickets/tickets";
import { LabelButton } from "../../ui/LabelButton";
import { PhotoSticker } from "../../ui/PhotoSticker";
import { QuietLink } from "../../ui/QuietLink";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { joinedAt, streakOf } from "./userStats";
import "./stat-board.css";

export interface StatBoardHandle {
  /** The papers swing and settle, as the board lands after its turn. */
  settle: () => void;
}

interface Props {
  /** Null when they didn't load, so nothing drawn from them can be known. */
  stickers: readonly StickerRecord[] | null;
  gifts: ReadonlyMap<string, StickerGiftStatus>;
  onFlipBack: () => void;
  flipBackRef: Ref<HTMLButtonElement>;
  ref?: Ref<StatBoardHandle>;
}

const num = (n: number) => n.toLocaleString("en-US");
const days = (n: number) => `${num(n)} ${n === 1 ? "day" : "days"}`;

/** A figure that can't be known, because the stickers didn't load. */
function Unknown() {
  return (
    <>
      <span aria-hidden>–</span>
      <span className="visually-hidden">not known</span>
    </>
  );
}

const figure = (n: number | null) => (n === null ? <Unknown /> : num(n));

// Things stuck on the cork; a tap anywhere else is on bare cork.
const ON_CORK =
  ".stat-board__note, .stat-board__stamp, .stat-board__tape, .stat-board__who, button";

// The developer slip, LINE's and Privy's details for testing them from the board. The dev server shows
// it unless `.env` says "off"; a build shows it only when it's "on".
const DEV_SLIP = import.meta.env.VITE_DEV_SLIP
  ? import.meta.env.VITE_DEV_SLIP === "on"
  : import.meta.env.DEV;

/** A paper hanging from its pin or tape swings and settles; `k` scales the swing and turns it. */
function swing(paper: Element, k: number, delay = 0) {
  paper.animate(
    [
      { rotate: "0deg" },
      { rotate: `${(2.8 * k).toFixed(2)}deg`, offset: 0.2 },
      { rotate: `${(-1.5 * k).toFixed(2)}deg`, offset: 0.48 },
      { rotate: `${(0.6 * k).toFixed(2)}deg`, offset: 0.74 },
      { rotate: "0deg" },
    ],
    { duration: 950, delay, easing: "cubic-bezier(.3,.6,.4,1)" },
  );
}

/**
 * The stat board: the Sticker Board's back, cork with your User Stats pinned on as paper. Gratitude
 * and received stickers show their empty values until receiving and gratitude exist.
 */
export function StatBoard({ stickers, gifts, onFlipBack, flipBackRef, ref }: Props) {
  const me = useIdentity();
  const reduced = useReducedMotion();
  const cork = useRef<HTMLDivElement>(null);
  const [firstVisit] = useState(firstSeen);
  const id = useId();

  useImperativeHandle(
    ref,
    () => ({
      settle: () => {
        if (reduced || !cork.current) return;
        cork.current
          .querySelectorAll(".stat-board__note > .stat-board__paper")
          .forEach((paper, i) => swing(paper, i % 2 ? -0.85 : 1, 20 + i * 70));
      },
    }),
    [reduced],
  );

  const now = new Date();
  const streak =
    stickers &&
    streakOf(
      stickers.map((s) => ticketDay(new Date(s.createdAt))),
      ticketDay(now),
    );
  const given = stickers && stickers.filter((s) => gifts.get(s.id)?.state === "sent").length;
  const since = formatDay(joinedAt(firstVisit, stickers ?? []));
  const stamps = [
    { label: "made", count: stickers && stickers.length, hue: "var(--seal)" },
    { label: "received", count: 0, hue: "var(--grape)" },
    { label: "given", count: given, hue: "var(--aqua)" },
  ];

  const onCorkClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof Element && !e.target.closest(ON_CORK)) onFlipBack();
  };

  // A tap on a note's paper nudges it. Its controls press, and its selectable text selects, without
  // moving it.
  const nudge = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target;
    if (reduced || !(target instanceof Element) || target.closest("button, a")) return;
    const style = getComputedStyle(target);
    if ((style.userSelect || style.getPropertyValue("-webkit-user-select")) === "text") return;
    const note = target.closest(".stat-board__note");
    const paper = note?.querySelector(":scope > .stat-board__paper");
    if (note && paper) swing(paper, note.classList.contains("stat-board__scrap") ? 0.45 : 0.6);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    onFlipBack();
  };

  return (
    <div
      className="stat-board"
      role="dialog"
      aria-label={`${me.displayName}’s stats`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="stat-board__cork" ref={cork} onClick={onCorkClick} onPointerDown={nudge}>
        <div className="stat-board__stats">
          <div className="stat-board__who">
            <PhotoSticker src={me.pictureUrl} name={me.displayName} size={42} />
            <div className="stat-board__namecard">
              <i className="stat-board__washi stat-board__washi--pink" aria-hidden />
              <h2 className="stat-board__name">{me.displayName}</h2>
              <p className="fine stat-board__handle">
                {formatHandle(me.handle)} · name and picture from LINE
              </p>
            </div>
          </div>

          <div className="stat-board__col stat-board__col--a">
            <section
              className="stat-board__note stat-board__receipt"
              aria-labelledby={`${id}-gratitude`}
            >
              <i className="stat-board__pin stat-board__pin--pink" aria-hidden />
              <div className="stat-board__paper">
                <p className="fine stat-board__receipt-top" aria-hidden>
                  <span>{formatHandle(me.handle)}</span>
                  <span>{formatDay(now.getTime())}</span>
                </p>
                <h3 className="fine stat-board__receipt-h" id={`${id}-gratitude`}>
                  Gratitude received
                </h3>
                <p className="stat-board__receipt-none">
                  No gratitude yet. It arrives when someone you give a sticker to thanks you for it.
                </p>
                <p className="stat-board__receipt-total">
                  <span className="fine">Total</span>
                  <b>0</b>
                </p>
              </div>
            </section>

            <section className="stat-board__note stat-board__scrap" aria-labelledby={`${id}-bests`}>
              <div className="stat-board__paper">
                <h3 className="stat-board__scrap-h" id={`${id}-bests`}>
                  Bests
                </h3>
                <dl className="stat-board__scrap-rows">
                  <div>
                    <dt>Longest streak</dt>
                    <dd>
                      {!streak ? <Unknown /> : streak.best > 0 ? days(streak.best) : "None yet"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Best combo<small>Most hits in one thank-you</small>
                    </dt>
                    <dd>None yet</dd>
                  </div>
                  <div>
                    <dt>Most thanks in a day</dt>
                    <dd>None yet</dd>
                  </div>
                </dl>
              </div>
              <i className="stat-board__washi" aria-hidden />
            </section>

            <p className="stat-board__tape">
              <span className="visually-hidden">On the app since {since}</span>
              <span className="stat-board__tape-text" aria-hidden>
                Since {since}
              </span>
            </p>
          </div>

          <div className="stat-board__col stat-board__col--b">
            <section className="stat-board__note stat-board__leaf" aria-labelledby={`${id}-streak`}>
              <i className="stat-board__pin" aria-hidden />
              <div className="stat-board__paper">
                <h3 className="fine stat-board__leaf-band" id={`${id}-streak`}>
                  Streak
                </h3>
                {!streak ? (
                  <p className="stat-board__leaf-n">
                    <b>
                      <Unknown />
                    </b>
                  </p>
                ) : streak.current > 0 ? (
                  <p className="stat-board__leaf-n">
                    <b>{num(streak.current)}</b>
                    <span className="fine">{streak.current === 1 ? "day" : "days"}</span>
                  </p>
                ) : (
                  <p className="stat-board__leaf-n stat-board__leaf-n--none">
                    <b>Not started</b>
                  </p>
                )}
                <p className="stat-board__leaf-rule">
                  {!streak
                    ? "Your stickers didn’t load."
                    : streak.current > 0
                      ? `Miss a day and it drops by one, not back to zero. Days turn over at ${formatRefillTime(nextRefill(now))}.`
                      : "Draw a sticker today to start one. Miss a day later and it drops by one."}
                </p>
              </div>
            </section>

            <div className="stat-board__stamps" role="group" aria-label="Stickers">
              {stamps.map(({ label, count, hue }, i) => (
                <p key={label} className={`stat-board__stamp stat-board__stamp--${i}`}>
                  <span className="stat-board__stamp-paper">
                    <span className="stat-board__stamp-print" style={{ "--c": hue }}>
                      <b>{figure(count)}</b>
                      <span className="fine">{label}</span>
                    </span>
                  </span>
                </p>
              ))}
            </div>

            <LabelButton
              ref={flipBackRef}
              size="sm"
              icon={<ArrowUUpLeft />}
              className="stat-board__flip-back"
              onClick={onFlipBack}
            >
              Flip back
            </LabelButton>
            {/* Outside LINE's app it's the only way to switch LINE accounts, so it's never behind the dev flag. */}
            {!me.inClient && (
              <LabelButton
                size="sm"
                icon={<SignOut />}
                className="stat-board__logout"
                onClick={lineLogout}
              >
                Log out of LINE
              </LabelButton>
            )}
          </div>
        </div>

        {DEV_SLIP && (
          <section className="stat-board__note stat-board__slip" aria-labelledby={`${id}-line`}>
            <div className="stat-board__paper">
              <h3 className="fine stat-board__slip-h" id={`${id}-line`}>
                LINE and Privy
              </h3>
              <SendTestMessage senderName={me.displayName} />
              <LineDetails />
              <PrivyLine />
              <PrivyAccount />
            </div>
            <i className="stat-board__washi" aria-hidden />
          </section>
        )}
      </div>
    </div>
  );
}

function privyText(privy: PrivyStatus): string {
  switch (privy.state) {
    case "signed-in":
      return "Signed in to Privy";
    case "signing-in":
      return "Signing in to Privy…";
    case "failed":
      return `Privy sign-in failed: ${privy.reason}`;
    case "off":
      return `Privy is off: ${privy.reason}`;
  }
}

/** The Privy sign-in. After a failure it waits for Try again, since Privy's SDK would retry in a loop. */
function PrivyLine() {
  const privy = usePrivyStatus();
  return (
    <div className="stat-board__privy">
      <p className="stat-board__privy-status">{privyText(privy)}</p>
      {privy.state === "failed" && <QuietLink onClick={retryPrivySignIn}>Try again</QuietLink>}
    </div>
  );
}
