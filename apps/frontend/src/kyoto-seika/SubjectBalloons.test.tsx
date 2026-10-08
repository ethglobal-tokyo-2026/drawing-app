// @vitest-environment happy-dom
import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { act, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../i18n/i18n";
import { strings } from "../i18n/strings";
import { seededRandom } from "../ui/seededRandom";
import { pairLayout } from "./balloonGeometry";
import { rollDie, type Balloon, type Deal } from "./deal";
import { CHARRED_AT_ROLL, TEASE_LINES } from "./dieMood";
import { BOOM_DELAY_MS } from "./dealMotion";
import { SubjectBalloons } from "./SubjectBalloons";
import { DEAL, SPORTS, TEST_SUBJECTS, WIND } from "./testSubjects";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const LAYOUT = pairLayout({ width: 390, top: 100, bottom: 700 });

let cleanup = () => {};
afterEach(async () => {
  cleanup();
  await i18next.changeLanguage("en");
});

function render(node: React.ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  cleanup = () => {
    act(() => root.unmount());
    host.remove();
  };
  return host;
}

/** The deal as the harness last rolled it. */
let dealtNow: Deal = DEAL;
/** The balloons over a deal its dice roll, as the drawing screen holds one. */
function Harness() {
  const [deal, setDeal] = useState(DEAL);
  useEffect(() => {
    dealtNow = deal;
  });
  const roll = (balloon: Balloon) =>
    setDeal(
      (d) =>
        rollDie(TEST_SUBJECTS, d, balloon, { recent: [], dark: false, random: seededRandom(3) }) ??
        d,
    );
  return <SubjectBalloons deal={deal} layout={LAYOUT} onRoll={roll} />;
}

const dice = (host: HTMLElement) => [...host.querySelectorAll<HTMLButtonElement>(".subject-die")];
const said = (subject: KyotoSeikaSubject) =>
  strings.kyotoSeika.balloons.subject.en
    .replace("{{word}}", subject.ja)
    .replace("{{english}}", subject.en);

describe("the Kyoto Seika balloons", () => {
  it("names the pair as a group, and each die by the subject it would replace", () => {
    const host = render(<SubjectBalloons deal={DEAL} onRoll={() => {}} layout={LAYOUT} />);
    expect(host.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe(
      strings.kyotoSeika.balloons.label.en,
    );
    const roll = (subject: KyotoSeikaSubject) =>
      strings.kyotoSeika.balloons.roll.en
        .replace("{{word}}", subject.ja)
        .replace("{{english}}", subject.en);
    expect(dice(host).map((d) => d.getAttribute("aria-label"))).toEqual(DEAL.subjects.map(roll));
  });

  it("reads each new subject out politely", () => {
    const host = render(<Harness />);
    const status = host.querySelector('[role="status"]');
    expect(status?.textContent).toBe("");
    act(() => dice(host)[1].click());
    expect(dealtNow.subjects[1]).not.toBe(DEAL.subjects[1]);
    expect(status?.textContent).toBe(said(dealtNow.subjects[1]));
  });

  it("shows each subject's word, with its reading over kanji only, and its English, and nothing more", async () => {
    const deal: Deal = { subjects: [WIND, SPORTS], rolls: [0, 0] };
    const host = render(<SubjectBalloons deal={deal} onRoll={() => {}} layout={LAYOUT} />);
    const [upper, lower] = [...host.querySelectorAll(".subject-balloon")];
    expect([...upper.querySelectorAll("rt")].map((rt) => rt.textContent)).toEqual([WIND.reading]);
    expect(lower.querySelector("rt")).toBeNull();
    for (const language of ["en", "ja"]) {
      await act(() => i18next.changeLanguage(language));
      expect(upper.textContent).toBe(`${WIND.ja}${WIND.reading}${WIND.en}`);
      expect(lower.textContent).toBe(`${SPORTS.ja}${SPORTS.en}`);
    }
  });

  it("charred, a die takes no roll and says the subject stays", () => {
    const onRoll = vi.fn();
    const host = render(
      <SubjectBalloons
        deal={{ ...DEAL, rolls: [CHARRED_AT_ROLL, 0] }}
        onRoll={onRoll}
        layout={LAYOUT}
      />,
    );
    act(() => dice(host)[0].click());
    expect(onRoll).not.toHaveBeenCalled();
    expect(dice(host)[0].getAttribute("aria-disabled")).toBe("true");
    expect(dice(host)[0].getAttribute("aria-label")).toBe(strings.kyotoSeika.balloons.charred.en);
    act(() => dice(host)[1].click());
    expect(onRoll).toHaveBeenCalledWith(1);
  });
});

describe("a die rolled too often", () => {
  afterEach(() => vi.useRealTimers());

  /**
   * The balloons over a deal, then over the deal after the upper die's roll number `rolls`;
   * `renderAgain` renders that deal once more, as the drawing screen does whenever it renders.
   */
  function rollUpperTo(rolls: number) {
    const before: Deal = { ...DEAL, rolls: [rolls - 1, 0] };
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<SubjectBalloons deal={before} onRoll={() => {}} layout={LAYOUT} />));
    cleanup = () => {
      act(() => root.unmount());
      host.remove();
    };
    const spring = TEST_SUBJECTS.find((s) => s.ja === "春");
    if (!spring) throw new Error("the test list has no 春");
    const after: Deal = { subjects: [spring, DEAL.subjects[1]], rolls: [rolls, 0] };
    const renderAgain = () =>
      act(() => root.render(<SubjectBalloons deal={after} onRoll={() => {}} layout={LAYOUT} />));
    renderAgain();
    return { host, renderAgain };
  }
  const status = (host: HTMLElement) => host.querySelector('[role="status"]')?.textContent ?? "";
  const wait = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  it("teases at the first line's roll, in hand lettering, and reads it out", () => {
    const [firstRoll] = TEASE_LINES.keys();
    const { host } = rollUpperTo(firstRoll);
    const line = strings.kyotoSeika.tease.again.en;
    expect(host.querySelector(".die-tease")?.textContent).toBe(line);
    expect(status(host)).toContain(line);
  });

  it("chars at the last roll, and says the subject stays once the bang has gone off", () => {
    vi.useFakeTimers();
    const { host } = rollUpperTo(CHARRED_AT_ROLL);
    const charred = strings.kyotoSeika.balloons.charred.en;
    expect(dice(host)[0].getAttribute("aria-disabled")).toBe("true");
    wait(BOOM_DELAY_MS - 1);
    expect(status(host)).not.toContain(charred);
    wait(1);
    expect(status(host)).toContain(charred);
  });

  it("plays the bang once, as the die blows up, however often the balloons render after", () => {
    vi.useFakeTimers();
    const { host, renderAgain } = rollUpperTo(CHARRED_AT_ROLL);
    wait(BOOM_DELAY_MS);
    const burst = host.querySelector(".die-bang__burst");
    if (!burst) throw new Error("No bang");
    const played = vi.spyOn(burst, "animate");
    renderAgain();
    expect(played).not.toHaveBeenCalled();
  });
});
