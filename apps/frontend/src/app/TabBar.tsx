import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/react";
import { CaretUp, ExploreIcon, ShopIcon, StickerBoardIcon } from "../icons";
import { readStored, writeStored } from "../ui/deviceStorage";
import "./TabBar.css";

export type Tab = "board" | "explore" | "shop";

/** Tabs brought back over a screen that tucks them away go again after this long untouched. */
const IDLE_MS = 4000;
/** Dragging the grabber up this far brings the tabs back. */
const GRAB_PX = 8;
/** Set once the grabber has brought the tabs back, after which it needs no label. */
const GRABBED_KEY = "draw.tabs.grabbed";

const readGrabbed = () =>
  readStored(GRABBED_KEY, "Can't read whether the tab grabber was used on this device").text !==
  null;

const saveGrabbed = () =>
  writeStored(GRABBED_KEY, "1", "Can't save that the tab grabber was used on this device");

interface Props {
  /** None while drawing: Draw is the board's key, not a tab. */
  active?: Tab;
  /** The tabs tuck away below the screen, behind a grabber, so the screen gets the room. */
  tucked: boolean;
  onChange: (tab: Tab) => void;
}

/**
 * Index tabs cut from label stock; the current one is stuck on in its full hue. On a screen that
 * tucks them away, tapping the grabber or dragging it up brings them back, and the next touch
 * anywhere else, or a few idle seconds, tucks them away again. Until it has been used once, the
 * grabber is a label-stock pull tab that says where it goes.
 */
export function TabBar({ active, tucked, onChange }: Props) {
  const { t } = useTranslation();
  const nav = useRef<HTMLElement>(null);
  const grabber = useRef<HTMLButtonElement>(null);
  const grabY = useRef<number | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [shown, setShown] = useState(false);
  const [grabbed, setGrabbed] = useState(readGrabbed);
  if (!tucked && shown) setShown(false);
  const peeking = tucked && shown;

  // Keyboard focus on a tab going away with it would fall to the page body, so it goes to the grabber.
  const hide = () => {
    if (nav.current?.contains(document.activeElement)) grabber.current?.focus();
    setShown(false);
  };
  const waitIdle = () => {
    clearTimeout(idle.current);
    idle.current = setTimeout(hide, IDLE_MS);
  };
  const show = () => {
    setShown(true);
    waitIdle();
    if (grabbed) return;
    setGrabbed(true);
    saveGrabbed();
  };
  // Using the tabs keeps them up.
  const keepUp = () => {
    if (peeking) waitIdle();
  };

  useEffect(() => {
    if (!peeking) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node)) return;
      if (nav.current?.contains(e.target) || grabber.current?.contains(e.target)) return;
      hide();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [peeking]);

  // The grabber steps aside once the tabs are up; keyboard focus on it moves on to the tabs.
  useEffect(() => {
    if (peeking && document.activeElement === grabber.current)
      nav.current?.querySelector("button")?.focus();
  }, [peeking]);

  useEffect(() => () => clearTimeout(idle.current), []);

  const current = (tab: Tab) => (active === tab ? "page" : undefined);
  const weight = (tab: Tab) => (active === tab ? "fill" : "bold");
  return (
    <>
      <nav
        ref={nav}
        className={`tabs ${tucked ? "is-tucked" : ""} ${peeking ? "is-peeking" : ""}`}
        aria-label={t(($) => $.app.tabs.sections)}
        inert={tucked && !peeking}
        onPointerDown={keepUp}
        onPointerMove={keepUp}
        onFocus={keepUp}
        onKeyDown={keepUp}
      >
        <button
          className="tab tab-board"
          data-press
          aria-current={current("board")}
          onClick={() => onChange("board")}
        >
          <StickerBoardIcon size={20} weight={weight("board")} />
          <span>{t(($) => $.app.tabs.myBoard)}</span>
        </button>
        <button
          className="tab tab-explore"
          data-press
          aria-current={current("explore")}
          onClick={() => onChange("explore")}
        >
          <ExploreIcon size={20} weight={weight("explore")} />
          <span>{t(($) => $.app.tabs.explore)}</span>
        </button>
        <button
          className="tab tab-shop"
          data-press
          aria-current={current("shop")}
          onClick={() => onChange("shop")}
        >
          <ShopIcon size={20} weight={weight("shop")} />
          <span>{t(($) => $.app.tabs.shop)}</span>
        </button>
      </nav>
      {tucked && (
        <button
          ref={grabber}
          type="button"
          className={`tab-grabber ${grabbed ? "" : "is-pull-tab"} ${peeking ? "is-hidden" : ""}`}
          aria-label={t(($) => $.app.tabs.showTabs)}
          aria-expanded={peeking}
          tabIndex={peeking ? -1 : undefined}
          onPointerDown={(e) => {
            grabY.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (grabY.current === null || grabY.current - e.clientY <= GRAB_PX) return;
            grabY.current = null;
            show();
          }}
          onPointerUp={() => (grabY.current = null)}
          onPointerCancel={() => (grabY.current = null)}
          onClick={show}
        >
          {grabbed ? (
            <i />
          ) : (
            <span className="tab-pull">
              <CaretUp />
              {t(($) => $.app.tabs.grabber)}
            </span>
          )}
        </button>
      )}
    </>
  );
}
