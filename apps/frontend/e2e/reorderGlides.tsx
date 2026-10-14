import { createRef } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { KeepAnimations } from "../src/sticker-board/keepAnimations";
import { installLight, acquireLight } from "../src/stickers/light";

declare global {
  interface Window {
    reorderGlides: {
      start: () => void;
      reorder: () => { before: number[]; after: number[]; replays: number };
      positions: () => number[];
      transitions: () => number;
      animations: () => number;
      pause: () => void;
      remove: () => number;
    };
  }
}

const style = document.createElement("style");
style.textContent = `
  [data-sticker] { display: inline-block; width: 160px; height: 180px; }
  [data-part] { display: block; width: 20px; height: 20px; background: hotpink; }
  b[data-part] { translate: calc(var(--lx, 0) * 100px) 0; transition: translate 1000ms linear; }
  .sticker-crease > i { opacity: 0; transition: opacity 1000ms linear; }
  @media (prefers-reduced-motion: reduce) {
    b[data-part], .sticker-crease > i { transition: none; }
  }
`;
document.head.append(style);
const host = document.createElement("div");
document.body.append(host);
const stage = createRef<HTMLDivElement>();
const root = createRoot(host);
let order = ["a", "b"];
const render = () =>
  flushSync(() =>
    root.render(
      <div ref={stage}>
        <KeepAnimations order={order.join(" ")} root={stage}>
          {order.map((id) => (
            <div key={id} data-sticker={id}>
              {/* The Shop preview film's markup: its highlight is what moves with the light. */}
              <span className="laminate-film">
                <i>
                  <b data-part="film" />
                </i>
              </span>
              <span className="sticker-crease">
                <i data-part="crease" data-side="lit" />
              </span>
            </div>
          ))}
        </KeepAnimations>
      </div>,
    ),
  );
render();
const uninstall = installLight(host);
const release = acquireLight();
const parts = [...host.querySelectorAll<HTMLElement>('[data-sticker="a"] [data-part]')];
const positions = () =>
  parts.map((part) => {
    const computed = getComputedStyle(part);
    return parseFloat(part.dataset.part === "crease" ? computed.opacity : computed.translate);
  });
const animations = () => host.getAnimations({ subtree: true });
const freeze = () => {
  for (const animation of animations()) {
    animation.pause();
    animation.currentTime = 400;
  }
};
window.reorderGlides = {
  start: () => {
    positions();
    for (const part of host.querySelectorAll<HTMLElement>("[data-part]")) {
      if (part.dataset.part === "crease") part.style.opacity = "1";
      else part.style.setProperty("--lx", "1");
    }
  },
  reorder: () => {
    freeze();
    const before = positions();
    order = [...order].reverse();
    render();
    const after = positions();
    return {
      before,
      after,
      replays: animations().filter((a) => !(a instanceof CSSTransition)).length,
    };
  },
  positions,
  transitions: () => animations().filter((a) => a instanceof CSSTransition).length,
  animations: () => animations().length,
  pause: freeze,
  remove: () => {
    const running = animations();
    root.unmount();
    const remaining = running.filter((a) => a.playState !== "idle").length;
    release();
    uninstall();
    return remaining;
  },
};
