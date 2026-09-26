import { CaretUp, Eyes } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { useIdentity } from "../identity/useIdentity";
import { PhotoSticker } from "../ui/PhotoSticker";
import "./TabBar.css";

export type Tab = "board" | "explore";

/** Tabs brought back over a screen that tucks them away go again after this long untouched. */
const IDLE_MS = 4000;
/** Dragging the grabber up this far brings the tabs back. */
const GRAB_PX = 8;
/** Set once the grabber has brought the tabs back, after which it needs no label. */
const GRABBED_KEY = "draw.tabs.grabbed";

function readGrabbed(): boolean {
  try {
    return localStorage.getItem(GRABBED_KEY) !== null;
  } catch (error) {
    console.error("Can't read whether the tab grabber was used on this device", error);
    return false;
  }
}

function saveGrabbed(): void {
  try {
    localStorage.setItem(GRABBED_KEY, "1");
  } catch (error) {
    console.error("Can't save that the tab grabber was used on this device", error);
  }
}

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
  const me = useIdentity();
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
  return (
    <>
      <nav
        ref={nav}
        className={`tabs ${tucked ? "is-tucked" : ""} ${peeking ? "is-peeking" : ""}`}
        aria-label="App sections"
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
          {me.pictureUrl ? (
            <PhotoSticker src={me.pictureUrl} name={me.displayName} size={24} />
          ) : (
            <StickerBoardIcon weight={active === "board" ? "fill" : "bold"} />
          )}
          <span>My board</span>
        </button>
        <button
          className="tab tab-explore"
          data-press
          aria-current={current("explore")}
          onClick={() => onChange("explore")}
        >
          <Eyes size={20} weight={active === "explore" ? "fill" : "bold"} />
          <span>Explore</span>
        </button>
      </nav>
      {tucked && (
        <button
          ref={grabber}
          type="button"
          className={`tab-grabber ${grabbed ? "" : "is-pull-tab"} ${peeking ? "is-hidden" : ""}`}
          aria-label="Show the My board and Explore tabs"
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
              Board
            </span>
          )}
        </button>
      )}
    </>
  );
}
