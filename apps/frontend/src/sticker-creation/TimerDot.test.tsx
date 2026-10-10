// @vitest-environment happy-dom
import { act, createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithApi } from "../api/testing";
import { strings } from "../i18n/strings";
import { sessionMs } from "./session/session";
import { clockOnFrames } from "./session/testClock";
import { WARN_AT_SECONDS } from "./session/useSessionClock";
import { TimerDot, WIDE_FROM_SECONDS, type TimerDotHandle } from "./TimerDot";

let view: ReturnType<typeof renderWithApi> | undefined;
afterEach(() => {
  view?.unmount();
  view = undefined;
});

/** The timer dot over a clock on hand-driven frames, as the drawing screen shows it. */
function renderDot({
  length,
  started = true,
  waitsFor = "stroke",
  pausable = true,
}: {
  length: number;
  started?: boolean;
  waitsFor?: "stroke" | "begin";
  pausable?: boolean;
}) {
  const { clock, advance } = clockOnFrames({ length, started });
  const timer = createRef<TimerDotHandle>();
  view = renderWithApi(
    <TimerDot
      ref={timer}
      clock={clock}
      paused={false}
      note={null}
      waitsFor={waitsFor}
      pausable={pausable}
      onToggle={() => {}}
    />,
  );
  const { host } = view;
  return { clock, host, timer, advance: (ms: number) => act(() => advance(ms, 250)) };
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
/** The white label under the dot while it shows. */
const shownLabel = (host: HTMLElement) => host.querySelector(".timer-hint.is-on")?.textContent;

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
    expect(shownLabel(host)).toBe(call);
    expect(announced(host)).toContain(call);
    // A call is said once, as minutes, never again as a warning in seconds.
    const asWarning = strings.stickerCreation.timer.warning.en.replace(
      "{{seconds}}",
      String(firstCall),
    );
    expect(announced(host)).not.toContain(asWarning);
  });

  it("names a clock that never pauses as the timer, and says why when it's tapped", () => {
    const { host, timer } = renderDot({ length: sessionMs(true), pausable: false });
    expect(dot(host).getAttribute("aria-label")).toBe(strings.stickerCreation.timer.label.en);
    act(() => timer.current?.showClockRuns());
    const why = strings.stickerCreation.timer.note.clockRuns.en;
    expect(shownLabel(host)).toBe(why);
    expect(announced(host)).toContain(why);
  });

  it("names the timer as time's up at 0:00, never as a pause", () => {
    const length = 5000;
    const { advance, host } = renderDot({ length });
    advance(length + 1000);
    expect(dot(host).getAttribute("aria-label")).toBe(strings.stickerCreation.timer.label.en);
    expect(described(host)).toBe(strings.stickerCreation.timer.status.timeUp.en);
  });

  it("says a dealt clock starts at Begin", () => {
    const length = sessionMs(true);
    const { host } = renderDot({ length, started: false, waitsFor: "begin" });
    // The clock hasn't started, so it shows its whole length.
    const time = `${length / 60_000}:00`;
    expect(described(host)).toBe(
      strings.stickerCreation.timer.status.dealt.en.replace("{{time}}", time),
    );
  });

  it("brings the start note when a touch meets a sheet waiting for Begin", () => {
    const { host, timer } = renderDot({
      length: sessionMs(true),
      started: false,
      waitsFor: "begin",
    });
    expect(shownLabel(host)).toBeUndefined();
    act(() => timer.current?.showHint());
    expect(shownLabel(host)).toBe(strings.stickerCreation.timer.note.startsWhenYouPressBegin.en);
  });
});
