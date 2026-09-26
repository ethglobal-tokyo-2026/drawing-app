import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "../../i18n/react";
import { useReducedMotion } from "../../ui/useReducedMotion";
import "./developer-slip.css";
import { useRestingSide } from "./restingSide";
import { usePullToReveal } from "./usePullToReveal";

/** Room left above the slip's washi once it's brought into view, in px. */
const ROOM_ABOVE = 20;

/**
 * The developer slip: LINE's and Privy's details, for testing them from the board. It lies collapsed
 * under the end of the cork, off screen until a pull past the end brings it out, or the button only
 * keyboards and screen readers find. It goes back under when the board comes to rest on its front.
 */
export function DeveloperSlip({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const side = useRestingSide();
  const [out, setOut] = useState<"pulled" | "opened" | null>(null);
  if (out && side === "front") setOut(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const slip = useRef<HTMLElement>(null);

  usePullToReveal({ wrapper, enabled: !out, reduced, onReveal: () => setOut("pulled") });

  // Out, the cork glides up to it; opened with the button, focus goes in with it.
  useLayoutEffect(() => {
    const paper = slip.current;
    const cork = wrapper.current?.parentElement;
    if (!out || !paper || !cork) return;
    const below = paper.getBoundingClientRect().top - cork.getBoundingClientRect().top;
    cork.scrollTo({
      top: cork.scrollTop + below - ROOM_ABOVE,
      behavior: reduced ? "auto" : "smooth",
    });
    if (out === "opened") paper.focus({ preventScroll: true });
  }, [out, reduced]);

  const label = t(($) => $.stickerBoard.developer.label);
  return (
    <>
      {!out && (
        <button type="button" className="dev-slip__open" onClick={() => setOut("opened")}>
          {label}
        </button>
      )}
      <div ref={wrapper} className={out ? "dev-slip is-out" : "dev-slip"} inert={!out}>
        <section
          ref={slip}
          className="stat-board__note stat-board__slip"
          aria-label={label}
          tabIndex={-1}
        >
          <div className="stat-board__paper">
            <h3 className="fine stat-board__slip-h">{t(($) => $.stickerBoard.developer.title)}</h3>
            {children}
          </div>
          <i className="stat-board__washi" aria-hidden />
        </section>
      </div>
    </>
  );
}
