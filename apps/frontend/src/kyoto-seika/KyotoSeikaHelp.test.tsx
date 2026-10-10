// @vitest-environment happy-dom
import {
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_TIME_USED_S,
} from "@drawing-app/api/client";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { kyotoSeika } from "../i18n/strings/kyotoSeika";
import { pages } from "../i18n/strings/pages";
import { stickerBoard } from "../i18n/strings/stickerBoard";
import { KyotoSeikaHelp } from "./KyotoSeikaHelp";

let host: HTMLDivElement;
let root: Root;
const onClose = vi.fn();

const render = (open: boolean) =>
  act(() => root.render(<KyotoSeikaHelp open={open} onClose={onClose} />));
const dialog = () => host.querySelector<HTMLElement>("[role=dialog]");
const textOf = (selector: string) =>
  [...host.querySelectorAll(selector)].map((el) => el.textContent ?? "");

beforeEach(() => {
  // A closed sheet's step back in history waits on a timer; none of these tests wants it to run.
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onClose.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("KyotoSeikaHelp", () => {
  it("opens as a dialog named for the mode, closes from its perforation, and goes once it has slid away", () => {
    render(false);
    expect(dialog()).toBeNull();

    render(true);
    expect(dialog()?.getAttribute("aria-label")).toBe(
      stickerBoard.settings.kyotoSeika.spokenName.en,
    );
    act(() => host.querySelector<HTMLElement>(".perf")?.click());
    expect(onClose).toHaveBeenCalledTimes(1);

    render(false);
    act(() => void dialog()?.dispatchEvent(new Event("animationend", { bubbles: true })));
    expect(dialog()).toBeNull();
  });

  it("keeps its taps and Escape from what it's in, as the stat board's cork, and Escape closes it", () => {
    // The cork's own Escape stops there, and flips the board back.
    const cork = vi.fn((e: { stopPropagation: () => void }) => e.stopPropagation());
    act(() =>
      root.render(
        <div onClick={cork} onKeyDown={cork}>
          <KyotoSeikaHelp open onClose={onClose} />
        </div>,
      ),
    );
    const perf = host.querySelector(".perf");
    act(
      () =>
        void perf?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
    );
    act(() => host.querySelector<HTMLElement>(".kyoto-seika-help__lead")?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(cork).not.toHaveBeenCalled();
  });

  it("shows the mode's clock and daily tickets, in its panels and their captions", () => {
    render(true);
    const minutes = KYOTO_SEIKA_TIME_USED_S / 60;
    const tickets = KYOTO_SEIKA_DAILY_TICKETS_PER_DAY;
    expect(textOf(".timer-time")).toEqual([`${minutes}:00`]);
    expect(textOf(".ticket-count")).toEqual([`×${tickets}`]);
    const captions = textOf(".kyoto-seika-help__caption");
    expect(captions.filter((caption) => caption.includes(`${minutes} `))).toHaveLength(1);
    expect(captions.filter((caption) => caption.includes(`${tickets} `))).toHaveLength(1);
  });

  it("credits the subjects with a link to the sources page", () => {
    render(true);
    const credit = [...host.querySelectorAll("a")].find(
      (a) => a.textContent === kyotoSeika.help.credit.en,
    );
    expect(credit?.getAttribute("href")).toBe(pages.sources.en);
  });
});
