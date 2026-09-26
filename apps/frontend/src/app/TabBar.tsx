import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePress } from "../controls/usePress";
import { EyesIcon } from "../icons/EyesIcon";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { useIdentity } from "../identity/useIdentity";
import "../controls/controls.css";
import "./TabBar.css";

export type Tab = "board" | "explore";

/** Revealed tabs tuck away again after this long without a touch. */
const IDLE_TUCK_MS = 4000;
/** A drag up the grabber past this reveals the tabs; less than TAP_SLOP counts as a tap. */
const DRAG_REVEAL = 10;
const TAP_SLOP = 6;

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  /** The screen wants the room: the tabs tuck below the page behind a grabber. */
  tucked: boolean;
}

function IndexTab({
  tab,
  label,
  icon,
  current,
  onChange,
}: {
  tab: Tab;
  label: string;
  icon: ReactNode;
  current: boolean;
  onChange: (tab: Tab) => void;
}) {
  const { handlers } = usePress(() => onChange(tab));
  return (
    <button
      type="button"
      className={`index-tab index-tab-${tab} ${current ? "current" : ""}`}
      aria-current={current ? "page" : undefined}
      {...handlers}
    >
      <span className="tab-face">
        {icon}
        {label}
      </span>
    </button>
  );
}

export function TabBar({ active, onChange, tucked }: Props) {
  const me = useIdentity();
  const [revealed, setRevealed] = useState(false);
  const strip = useRef<HTMLElement>(null);
  const hidden = tucked && !revealed;

  // Changing screens starts over tucked.
  const [prevTucked, setPrevTucked] = useState(tucked);
  if (tucked !== prevTucked) {
    setPrevTucked(tucked);
    setRevealed(false);
  }

  // Revealed over a tucking screen: the next touch elsewhere, or idling, tucks them away.
  useEffect(() => {
    if (!tucked || !revealed) return;
    let idle = window.setTimeout(() => setRevealed(false), IDLE_TUCK_MS);
    const onPointerDown = (e: PointerEvent) => {
      window.clearTimeout(idle);
      if (e.target instanceof Node && strip.current?.contains(e.target)) {
        idle = window.setTimeout(() => setRevealed(false), IDLE_TUCK_MS);
      } else {
        setRevealed(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.clearTimeout(idle);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [tucked, revealed]);

  const grab = useRef<number | null>(null);

  return (
    <>
      {tucked && (
        <button
          type="button"
          className="tab-grabber"
          aria-label="Show tabs"
          aria-expanded={revealed}
          onPointerDown={(e) => (grab.current = e.clientY)}
          onPointerUp={(e) => {
            if (grab.current === null) return;
            const dy = e.clientY - grab.current;
            grab.current = null;
            if (Math.abs(dy) < TAP_SLOP || dy < -DRAG_REVEAL) setRevealed(true);
          }}
          onPointerCancel={() => (grab.current = null)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            setRevealed(true);
          }}
        >
          <span />
        </button>
      )}
      <nav
        ref={strip}
        className={`tabbar ${tucked ? "tucking" : ""} ${hidden ? "tucked" : ""}`}
        aria-label="Main"
        inert={hidden}
      >
        <IndexTab
          tab="board"
          label="My board"
          current={active === "board"}
          onChange={onChange}
          // TODO: update later. The My board icon is the person's LINE picture as a photo
          // sticker; without a LINE login it falls back to the sticker board icon.
          icon={
            me.pictureUrl ? (
              <img className="tab-photo" src={me.pictureUrl} alt="" />
            ) : (
              <StickerBoardIcon size={24} />
            )
          }
        />
        <IndexTab
          tab="explore"
          label="Explore"
          current={active === "explore"}
          onChange={onChange}
          icon={<EyesIcon size={24} weight={active === "explore" ? "fill" : "bold"} />}
        />
      </nav>
    </>
  );
}
