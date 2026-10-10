// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { i18next } from "../../i18n/i18n";
import {
  SealingStatusLabel,
  SHOW_AFTER_MS,
  TAKES_A_WHILE_MS,
  TAKING_LONGER_MS,
} from "./SealingStatusLabel";

const SEALING = i18next.t(($) => $.stickerCreation.sealCeremony.sealing);
const TAKES_A_WHILE = i18next.t(($) => $.stickerCreation.sealCeremony.takesAWhile);
const TAKING_LONGER = i18next.t(($) => $.stickerCreation.sealCeremony.takingLonger);

let view: ReturnType<typeof renderWithApi> | undefined;
/** The clock moves on only in act, so each step's timers render before the test looks. */
let now = 0;
const until = (ms: number) => {
  act(() => void vi.advanceTimersByTime(ms - now));
  now = ms;
};
const label = () => view?.host.querySelector(".sealing-status") ?? null;
const shown = (part: "line" | "note") =>
  label()?.querySelector(`.sealing-status__${part}`)?.textContent ?? null;
const heard = () => view?.host.querySelector('[role="status"]')?.textContent;

beforeEach(() => {
  vi.useFakeTimers();
  now = 0;
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.useRealTimers();
});

describe("SealingStatusLabel", () => {
  it("sticks on once sealing takes a moment, and says more as the wait goes on", () => {
    view = renderWithApi(<SealingStatusLabel waiting />);
    until(SHOW_AFTER_MS - 1);
    expect(label()).toBeNull();
    expect(heard()).toBe("");
    until(SHOW_AFTER_MS);
    expect(shown("line")).toBe(SEALING);
    expect(shown("note")).toBeNull();
    expect(heard()).toBe(SEALING);
    until(TAKES_A_WHILE_MS);
    expect(shown("note")).toBe(TAKES_A_WHILE);
    expect(label()?.classList.contains("is-restuck")).toBe(true);
    expect(heard()).toBe(`${SEALING} ${TAKES_A_WHILE}`);
    until(TAKING_LONGER_MS);
    expect(shown("note")).toBe(TAKING_LONGER);
  });

  it("never shows for a quick seal", () => {
    view = renderWithApi(<SealingStatusLabel waiting />);
    until(SHOW_AFTER_MS - 1);
    view.rerender(<SealingStatusLabel waiting={false} />);
    until(TAKING_LONGER_MS);
    expect(label()).toBeNull();
  });

  it("peels off when the wait ends, and starts afresh for the next seal", () => {
    view = renderWithApi(<SealingStatusLabel waiting />);
    until(TAKES_A_WHILE_MS);
    view.rerender(<SealingStatusLabel waiting={false} />);
    expect(label()?.classList.contains("is-peeling")).toBe(true);
    expect(heard()).toBe("");
    act(() => {
      label()?.dispatchEvent(
        new AnimationEvent("animationend", { animationName: "sealing-status-peel", bubbles: true }),
      );
    });
    expect(label()).toBeNull();

    view.rerender(<SealingStatusLabel waiting />);
    until(TAKES_A_WHILE_MS + SHOW_AFTER_MS);
    expect(shown("line")).toBe(SEALING);
    expect(shown("note")).toBeNull();
  });
});
