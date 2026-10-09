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
      (d) => rollDie(TEST_SUBJECTS, d, balloon, { recent: [], random: seededRandom(3) }) ?? d,
    );
  return <SubjectBalloons deal={deal} layout={LAYOUT} onRoll={roll} />;
}

const dice = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLButtonElement>(".subject-reroll"),
];
const said = (subject: KyotoSeikaSubject) =>
  strings.kyotoSeika.balloons.subject.en
    .replace("{{word}}", subject.ja)
    .replace("{{english}}", subject.en);

describe("the Kyoto Seika balloons", () => {
  it("names the pair as a group", () => {
    const host = render(<SubjectBalloons deal={DEAL} onRoll={() => {}} layout={LAYOUT} />);
    expect(host.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe(
      strings.kyotoSeika.balloons.label.en,
    );
  });

  it("gives each cloud one reroll: its die and its hand lettering in one button, named by the subject it would replace", async () => {
    const host = render(<SubjectBalloons deal={DEAL} onRoll={() => {}} layout={LAYOUT} />);
    for (const language of ["en", "ja"] as const) {
      await act(() => i18next.changeLanguage(language));
      const { roll, reroll } = strings.kyotoSeika.balloons;
      const named = (subject: KyotoSeikaSubject) =>
        roll[language].replace("{{word}}", subject.ja).replace("{{english}}", subject.en);
      expect(dice(host).map((d) => d.getAttribute("aria-label"))).toEqual(DEAL.subjects.map(named));
      expect(dice(host).map((d) => d.textContent)).toEqual([reroll[language], reroll[language]]);
      expect(dice(host).every((d) => d.querySelector("svg"))).toBe(true);
      // Its name starts with the words it shows, so speech control finds it by them.
      for (const d of dice(host))
        expect(d.getAttribute("aria-label")?.startsWith(d.textContent ?? "-")).toBe(true);
    }
  });

  it("reads each new subject out politely", () => {
    const host = render(<Harness />);
    const status = host.querySelector('[role="status"]');
    expect(status?.textContent).toBe("");
    act(() => dice(host)[1].click());
    expect(dealtNow.subjects[1]).not.toBe(DEAL.subjects[1]);
    expect(status?.textContent).toBe(said(dealtNow.subjects[1]));
  });

  it("shows each subject's word with its reading over kanji only, and no English, in either language", async () => {
    const deal: Deal = { subjects: [WIND, SPORTS], rolls: [0, 0] };
    const host = render(<SubjectBalloons deal={deal} onRoll={() => {}} layout={LAYOUT} />);
    const [upper, lower] = [...host.querySelectorAll(".subject-balloon")];
    expect([...upper.querySelectorAll("rt")].map((rt) => rt.textContent)).toEqual([WIND.reading]);
    expect(lower.querySelector("rt")).toBeNull();
    for (const language of ["en", "ja"]) {
      await act(() => i18next.changeLanguage(language));
      expect(upper.textContent).toBe(`${WIND.ja}${WIND.reading}`);
      expect(lower.textContent).toBe(SPORTS.ja);
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

/** Has the page ask for reduced motion, as the person's setting would, until the test ends. */
function reduceMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches: query.includes("reduce"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe("a roll", () => {
  afterEach(() => vi.restoreAllMocks());
  const pips = (host: HTMLElement) =>
    dice(host).map((d) => d.querySelector(".subject-reroll__pips")?.getAttribute("d"));

  it("lands its die on new pips, and pops a lettered コロッ beside it that screen readers skip", () => {
    const host = render(<Harness />);
    const before = pips(host);
    act(() => dice(host)[0].click());
    expect(pips(host)[0]).not.toBe(before[0]);
    expect(pips(host)[1]).toBe(before[1]);
    const sound = host.querySelector(".subject-reroll__sound");
    expect(sound?.textContent).toBe(strings.kyotoSeika.balloons.rollSound.en);
    expect(sound?.getAttribute("aria-hidden")).toBe("true");
  });

  it("under reduced motion only changes the die's pips and the cloud's word", () => {
    reduceMotion();
    const host = render(<Harness />);
    const word = () => host.querySelector(".subject-balloon__word")?.textContent;
    const before = { pips: pips(host), word: word() };
    act(() => dice(host)[0].click());
    expect(pips(host)[0]).not.toBe(before.pips[0]);
    expect(word()).not.toBe(before.word);
    expect(host.querySelector(".subject-reroll__sound")).toBeNull();
    expect(host.querySelector(".subject-puff")).toBeNull();
  });
});

describe("a die rolled too often", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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

  it("teases at the first line's roll, in hand lettering, and reads it out", () => {
    const [firstRoll] = TEASE_LINES.keys();
    const { host } = rollUpperTo(firstRoll);
    const line = strings.kyotoSeika.tease.again.en;
    expect(host.querySelector(".die-tease")?.textContent).toBe(line);
    expect(status(host)).toContain(line);
  });

  it("blows up at once on the last roll: the bang, the broken die and smoke, and says the subject stays, with no wait and no count", () => {
    vi.useFakeTimers();
    const { host } = rollUpperTo(CHARRED_AT_ROLL);
    const [upper] = dice(host);
    expect(host.querySelector(".die-bang__burst")).not.toBeNull();
    expect(upper.getAttribute("aria-disabled")).toBe("true");
    expect(upper.getAttribute("aria-label")).toBe(strings.kyotoSeika.balloons.charred.en);
    expect(upper.classList.contains("is-broken")).toBe(true);
    expect(upper.classList.contains("is-shaking")).toBe(false);
    expect(status(host)).toContain(strings.kyotoSeika.balloons.charred.en);
    expect(host.querySelector(".die-tease")).toBeNull();
    expect(host.querySelector(".die-bang__words")).toBeNull();
    expect(host.querySelector(".subject-balloon__smoke")).not.toBeNull();
    expect(upper.querySelector(".subject-reroll__smoke")).not.toBeNull();
  });

  it("under reduced motion, leaves only the broken die, with no bang or smoke", () => {
    reduceMotion();
    const { host } = rollUpperTo(CHARRED_AT_ROLL);
    const [upper] = dice(host);
    expect(upper.classList.contains("is-broken")).toBe(true);
    expect(status(host)).toContain(strings.kyotoSeika.balloons.charred.en);
    expect(host.querySelector(".die-bang")).toBeNull();
    expect(host.querySelector(".subject-balloon__smoke")).toBeNull();
    expect(upper.querySelector(".subject-reroll__smoke")).toBeNull();
  });

  it("plays the bang once, as the die blows up, however often the balloons render after", () => {
    vi.useFakeTimers();
    const { host, renderAgain } = rollUpperTo(CHARRED_AT_ROLL);
    const burst = host.querySelector(".die-bang__burst");
    if (!burst) throw new Error("No bang");
    const played = vi.spyOn(burst, "animate");
    renderAgain();
    expect(played).not.toHaveBeenCalled();
  });

  it("comes back from a reload broken, with no bang", () => {
    const host = render(
      <SubjectBalloons
        deal={{ ...DEAL, rolls: [CHARRED_AT_ROLL, 0] }}
        onRoll={() => {}}
        layout={LAYOUT}
      />,
    );
    expect(dice(host)[0].classList.contains("is-broken")).toBe(true);
    expect(host.querySelector(".die-bang")).toBeNull();
  });
});
