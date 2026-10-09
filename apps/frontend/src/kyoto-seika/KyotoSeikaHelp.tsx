import {
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_TIME_USED_S,
} from "@drawing-app/api/client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trans, useTranslation } from "../i18n/react";
import { openLinkInLine } from "../line/openLink";
import { sessionMs } from "../sticker-creation/session/session";
import { SessionClock } from "../sticker-creation/session/useSessionClock";
import { TimerDot } from "../sticker-creation/TimerDot";
import { TicketCount } from "../tickets/TicketCount";
import { Sheet } from "../ui/Sheet";
import { dealLayout } from "./balloonGeometry";
import { CensorBar } from "./CensorBar";
import type { Deal } from "./deal";
import { SubjectBalloons } from "./SubjectBalloons";
import "./kyoto-seika-help.css";

/** The deal the first panel shows: the five a past exam set, two of them picked, the die not rolled. */
const SAMPLE_DEAL: Deal = {
  subjects: [
    { ja: "風", reading: "かぜ", en: "wind" },
    { ja: "再会", reading: "さいかい", en: "reunion" },
    { ja: "地図", reading: "ちず", en: "map" },
    { ja: "SNS", reading: "", en: "social media" },
    { ja: "双子", reading: "ふたご", en: "twins" },
  ],
  picked: [0, 1],
  rolls: 0,
};

/** The drawing screen the first panel crops: a 390px phone's width, and just the room its roomy deal takes. */
const DEAL_SCREEN = { width: 390, height: 310 };

const stayPut = () => {};

/** A line with the censor bar in it. Screen readers hear it with the bar's word back: the bar is a sight gag. */
function BarredLine({ line }: { line: "lead" | "maker" }) {
  const { t } = useTranslation();
  const hidden = t(($) => $.kyotoSeika.help.hidden);
  return (
    <>
      <span aria-hidden="true">
        <Trans
          i18nKey={($) => $.kyotoSeika.help[line]}
          components={{ bar: <CensorBar hidden={hidden} /> }}
        />
      </span>
      <span className="visually-hidden">
        {t(($) => $.kyotoSeika.help[line]).replaceAll("<bar/>", hidden)}
      </span>
    </>
  );
}

/**
 * The sheet's body, mounted only while it shows: three panels of the real screens, small and inert, like
 * a 3-koma strip, each over its caption, between what the mode is for and the fine print.
 */
function HelpBody() {
  const { t } = useTranslation();
  const [layout] = useState(() =>
    dealLayout({ width: DEAL_SCREEN.width, top: 0, bottom: DEAL_SCREEN.height }),
  );
  // Never started: it reads the mode's full length, as a dealt sheet's timer does before Begin.
  const [clock] = useState(() => new SessionClock(undefined, sessionMs(true)));
  return (
    <>
      <p className="kyoto-seika-help__lead">
        <BarredLine line="lead" />
      </p>
      <ol className="kyoto-seika-help__strip">
        <li className="kyoto-seika-help__koma">
          <div className="kyoto-seika-help__panel" aria-hidden="true" inert>
            <div className="kyoto-seika-help__deal" style={DEAL_SCREEN}>
              <SubjectBalloons
                deal={SAMPLE_DEAL}
                layout={layout}
                onRoll={stayPut}
                onPick={stayPut}
                picture
              />
            </div>
          </div>
          <span className="kyoto-seika-help__caption keep-phrases">
            {t(($) => $.kyotoSeika.help.subjects)}
          </span>
        </li>
        <li className="kyoto-seika-help__koma">
          <div className="kyoto-seika-help__panel" aria-hidden="true" inert>
            <div className="kyoto-seika-help__clock">
              <TimerDot
                clock={clock}
                paused={false}
                note={null}
                waitsFor="begin"
                pausable={false}
                onToggle={stayPut}
              />
            </div>
          </div>
          <span className="kyoto-seika-help__caption keep-phrases">
            {t(($) => $.kyotoSeika.help.clock, { minutes: KYOTO_SEIKA_TIME_USED_S / 60 })}
          </span>
        </li>
        <li className="kyoto-seika-help__koma">
          <div className="kyoto-seika-help__panel" aria-hidden="true" inert>
            <div className="kyoto-seika-help__tickets">
              <TicketCount kind="daily" count={KYOTO_SEIKA_DAILY_TICKETS_PER_DAY} />
            </div>
          </div>
          <span className="kyoto-seika-help__caption keep-phrases">
            {t(($) => $.kyotoSeika.help.tickets, { tickets: KYOTO_SEIKA_DAILY_TICKETS_PER_DAY })}
          </span>
        </li>
      </ol>
      <p className="kyoto-seika-help__fine">
        <BarredLine line="maker" />
      </p>
      <a
        className="kyoto-seika-help__fine kyoto-seika-help__credit"
        href={t(($) => $.pages.sources)}
        target="_blank"
        rel="noreferrer"
        onClick={openLinkInLine}
      >
        {t(($) => $.kyotoSeika.help.credit)}
      </a>
    </>
  );
}

/**
 * Kyoto Seika Manga Expression Practice Mode's help, which Settings' "?" opens: a sheet on a phone and a
 * card on a large screen, held over the whole phone rather than inside the turned board. It stays
 * mounted, sliding away as it closes.
 */
export function KyotoSeikaHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  // Resolved once, so the sheet never moves between the page and the phone, which would remount it.
  const [phone] = useState(() => document.querySelector<HTMLElement>(".phone"));
  const layer = useRef<HTMLDivElement>(null);
  const sheet = (
    // Its taps and Escape stop here: from inside the stat board's cork, React would pass them on to
    // the cork's own, which flip the board back, and Escape would never reach the sheet's.
    <div
      ref={layer}
      className={`kyoto-seika-help-layer${open ? " is-open" : ""}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="kyoto-seika-help__scrim" onClick={onClose} />
      <Sheet
        label={t(($) => $.stickerBoard.settings.kyotoSeika.spokenName)}
        open={open}
        onClose={onClose}
        layer={layer}
        card
        className="kyoto-seika-help"
        head={
          <h2 className="kyoto-seika-help__title">
            <span aria-hidden="true">
              <Trans
                i18nKey={($) => $.stickerBoard.settings.kyotoSeika.name}
                components={{
                  bar: <CensorBar hidden={t(($) => $.stickerBoard.settings.kyotoSeika.hidden)} />,
                }}
              />
            </span>
            <span className="visually-hidden">
              {t(($) => $.stickerBoard.settings.kyotoSeika.spokenName)}
            </span>
          </h2>
        }
      >
        <HelpBody />
      </Sheet>
    </div>
  );
  return phone ? createPortal(sheet, phone) : sheet;
}
