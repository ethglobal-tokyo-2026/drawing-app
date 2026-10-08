// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { strings } from "../i18n/strings";
import { sessionMs } from "./session/session";
import { clockOnFrames } from "./session/testClock";
import { WARN_AT_SECONDS } from "./session/useSessionClock";
import { TimerDot, WIDE_FROM_SECONDS } from "./TimerDot";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let cleanup = () => {};
afterEach(() => cleanup());

/** The timer dot over a clock on hand-driven frames, as the drawing screen shows it. */
function renderDot({
  length,
  started = true,
  waitsFor = "stroke",
}: {
  length: number;
  started?: boolean;
  waitsFor?: "stroke" | "begin";
}) {
  const { clock, advance } = clockOnFrames({ length, started });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <TimerDot clock={clock} paused={false} note={null} waitsFor={waitsFor} onToggle={() => {}} />,
    ),
  );
  cleanup = () => {
    act(() => root.unmount());
    host.remove();
  };
  return { clock, host, advance: (ms: number) => act(() => advance(ms, 250)) };
}

const dot = (host: HTMLElement) => {
  const button = host.querySelector<HTMLButtonElement>(".timer-dot");
  if (!button) throw new Error("No timer dot");
  return button;
};
const described = (host: HTMLElement) =>
  host.querySelector(`[id="${dot(host).getAttribute("aria-describedby")}"]`)?.textContent ?? "";
const announced = (host: HTMLElement) =>
  [...host.querySelectorAll('[role="status"]')].map((status) => status.textContent);

describe("the timer dot", () => {
  it("grows to the wide dot while the clock reads 10:00 or more", () => {
    const { advance, host } = renderDot({ length: sessionMs(true) });
    expect(dot(host).classList).toContain("is-wide");
    advance(sessionMs(true) - WIDE_FROM_SECONDS * 1000 + 1000);
    expect(dot(host).classList).not.toContain("is-wide");
  });

  it("shows the proctor's time call on its label, and reads it out", () => {
    const { advance, host } = renderDot({ length: sessionMs(true) });
    const [firstCall] = WARN_AT_SECONDS;
    advance(sessionMs(true) - firstCall * 1000);
    const call = strings.stickerCreation.timer.note.minutesLeft.en.replace(
      "{{minutes}}",
      String(firstCall / 60),
    );
    expect(host.querySelector(".timer-hint.is-on")?.textContent).toBe(call);
    expect(announced(host)).toContain(call);
    expect(announced(host).join(" ")).not.toMatch(/seconds/);
  });

  it("says a dealt clock starts at Begin", () => {
    const { host } = renderDot({ length: sessionMs(true), started: false, waitsFor: "begin" });
    expect(described(host)).toMatch(/press Begin/);
  });
});
