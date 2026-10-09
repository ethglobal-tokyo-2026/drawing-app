import { useLayoutEffect, type RefObject } from "react";

/** A scale this close to 1 is no zoom. */
const UNZOOMED = 0.01;

/** The visual viewport, as this reads it, so a test can stand in for the browser's. */
export interface VisibleArea extends Pick<EventTarget, "addEventListener" | "removeEventListener"> {
  readonly height: number;
  readonly offsetTop: number;
  readonly scale: number;
}

/**
 * Keeps `paper`'s content in what the on-screen keyboard leaves visible. iOS's keyboard shrinks only
 * the visual viewport, and may slide the page up to show a field, so this sets `--hidden-top` and
 * `--hidden-bottom` on `paper` for its padding, and brings the focused field's form into view as the
 * keyboard comes or goes. A zoomed page pads by nothing: zoom, not a keyboard, shrank what shows.
 */
export function useVisibleArea(
  paper: RefObject<HTMLElement | null>,
  area: VisibleArea | null = window.visualViewport,
) {
  useLayoutEffect(() => {
    const el = paper.current;
    if (!el || !area) return;
    const follow = (event?: Event) => {
      const zoomed = Math.abs(area.scale - 1) > UNZOOMED;
      const top = zoomed ? 0 : Math.max(0, Math.round(area.offsetTop));
      const bottom = zoomed
        ? 0
        : Math.max(0, Math.round(window.innerHeight - area.offsetTop - area.height));
      el.style.setProperty("--hidden-top", `${top}px`);
      el.style.setProperty("--hidden-bottom", `${bottom}px`);
      // Only as the keyboard comes or goes: scrolling on a slide's scroll events would fight iOS's own.
      if (event?.type !== "resize") return;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused !== el && el.contains(focused)) {
        (focused.closest("form") ?? focused).scrollIntoView({ block: "nearest" });
      }
    };
    follow();
    area.addEventListener("resize", follow);
    area.addEventListener("scroll", follow);
    return () => {
      area.removeEventListener("resize", follow);
      area.removeEventListener("scroll", follow);
    };
  }, [paper, area]);
}
