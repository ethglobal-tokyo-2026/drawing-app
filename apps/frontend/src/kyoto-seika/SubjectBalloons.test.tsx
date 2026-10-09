// @vitest-environment happy-dom
import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { act, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../i18n/i18n";
import { strings } from "../i18n/strings";
import { seededRandom } from "../ui/seededRandom";
import { dealLayout } from "./balloonGeometry";
import { dealKinds, rollDie, togglePick, type Deal } from "./deal";
import { CHARRED_AT_ROLL, TEASE_LINES } from "./dieMood";
import { SubjectBalloons } from "./SubjectBalloons";
import { DEAL, SPORTS, TEST_SUBJECTS, WIND } from "./testSubjects";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const LAYOUT = dealLayout({
  width: 390,
  top: 100,
  bottom: 700,
  kinds: dealKinds(TEST_SUBJECTS, DEAL),
  list: TEST_SUBJECTS,
  seed: 1,
});
const idle = () => {};

let cleanup = () => {};
afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await i18next.changeLanguage("en");
});

/** Renders `node`, and returns its host and a way to render something else in its place. */
function render(node: React.ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  cleanup = () => {
    act(() => root.unmount());
    host.remove();
  };
  return { host, again: (next: React.ReactNode) => act(() => root.render(next)) };
}
const still = (deal: Deal) => (
  <SubjectBalloons deal={deal} layout={LAYOUT} onRoll={idle} onPick={idle} />
);

/** The deal as the harness last held it. */
let dealtNow: Deal = DEAL;
/** The clouds over a deal its die rolls and its taps pick, as the drawing screen holds one. */
function Harness() {
  const [deal, setDeal] = useState(DEAL);
  useEffect(() => {
    dealtNow = deal;
  });
  const roll = () =>
    setDeal((d) => rollDie(TEST_SUBJECTS, d, { recent: [], random: seededRandom(3) }) ?? d);
  const pick = (place: number) => setDeal((d) => togglePick(d, place) ?? d);
  return <SubjectBalloons deal={deal} layout={LAYOUT} onRoll={roll} onPick={pick} />;
}

const toggles = (host: HTMLElement) => [
  ...host.querySelectorAll<HTMLButtonElement>(".subject-balloon__pick"),
];
const die = (host: HTMLElement) => {
  const found = host.querySelector<HTMLButtonElement>(".subject-reroll");
  if (!found) throw new Error("No die");
  return found;
};
const pressed = (host: HTMLElement) => toggles(host).map((t) => t.getAttribute("aria-pressed"));
const said = (subject: KyotoSeikaSubject) =>
  strings.kyotoSeika.balloons.subject.en
    .replace("{{word}}", subject.ja)
    .replace("{{english}}", subject.en);
const status = (host: HTMLElement) => host.querySelector('[role="status"]')?.textContent ?? "";

describe("the Kyoto Seika clouds", () => {
  it("names the deal as a group, and each cloud as a toggle by its word: in English with its English", async () => {
    const { host } = render(still(DEAL));
    expect(host.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe(
      strings.kyotoSeika.balloons.label.en,
    );
    expect(toggles(host).map((t) => t.getAttribute("aria-label"))).toEqual(DEAL.subjects.map(said));
    expect(pressed(host)).toEqual(DEAL.subjects.map(() => "false"));
    await act(() => i18next.changeLanguage("ja"));
    expect(toggles(host).map((t) => t.getAttribute("aria-label"))).toEqual(
      DEAL.subjects.map((s) => s.ja),
    );
  });

  it("picks a subject at a tap and unpicks it at the next; with two picked, the rest take no pick", () => {
    const { host } = render(<Harness />);
    act(() => toggles(host)[3].click());
    act(() => toggles(host)[0].click());
    expect(pressed(host)).toEqual(["true", "false", "false", "true", "false"]);
    expect(toggles(host).map((t) => t.getAttribute("aria-disabled"))).toEqual([
      null,
      "true",
      "true",
      null,
      "true",
    ]);
    act(() => toggles(host)[1].click());
    expect(dealtNow.picked).toEqual([3, 0]);
    act(() => toggles(host)[3].click());
    act(() => toggles(host)[1].click());
    expect(dealtNow.picked).toEqual([0, 1]);
  });

  it("under reduced motion, inks a picked cloud at once, its white word for sight only, and an unpick takes the ink off at once", () => {
    reduceMotion();
    const { host } = render(<Harness />);
    const inked = () =>
      [...host.querySelectorAll(".subject-balloon")].map(
        (cloud) => cloud.querySelector(".subject-balloon__ink") !== null,
      );
    act(() => toggles(host)[1].click());
    expect(inked()).toEqual([false, true, false, false, false]);
    expect(host.querySelector(".subject-balloon__lettered")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    act(() => toggles(host)[1].click());
    expect(inked()).toEqual([false, false, false, false, false]);
  });

  it("gives the deal one die, named by its lettering, that deals again only what isn't picked, and reads each new subject out", async () => {
    const { host } = render(<Harness />);
    expect(host.querySelectorAll(".subject-reroll")).toHaveLength(1);
    expect(die(host).textContent).toBe(strings.kyotoSeika.balloons.reroll.en);
    expect(die(host).getAttribute("aria-label")).toBeNull();
    act(() => toggles(host)[2].click());
    act(() => die(host).click());
    expect(dealtNow.subjects[2]).toBe(DEAL.subjects[2]);
    const dealt = dealtNow.subjects.filter((s, place) => s !== DEAL.subjects[place]);
    expect(dealt.length).toBeGreaterThan(0);
    expect(status(host)).toBe(dealt.map(said).join(" "));
    await act(() => i18next.changeLanguage("ja"));
    expect(die(host).textContent).toBe(strings.kyotoSeika.balloons.reroll.ja);
  });

  it("shows each subject's word with its reading over kanji only, and no English, in either language", async () => {
    const { host } = render(still({ subjects: [WIND, SPORTS], picked: [], rolls: 0 }));
    const [wind, sports] = [...host.querySelectorAll(".subject-balloon__words")];
    expect([...wind.querySelectorAll("rt")].map((rt) => rt.textContent)).toEqual([WIND.reading]);
    expect(sports.querySelector("rt")).toBeNull();
    for (const language of ["en", "ja"]) {
      await act(() => i18next.changeLanguage(language));
      expect(wind.textContent).toBe(`${WIND.ja}${WIND.reading}`);
      expect(sports.textContent).toBe(SPORTS.ja);
    }
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
  const pips = (host: HTMLElement) =>
    die(host).querySelector(".subject-reroll__pips")?.getAttribute("d");

  it("lands the die on new pips, and pops a lettered コロッ beside it that screen readers skip", () => {
    const { host } = render(<Harness />);
    const before = pips(host);
    act(() => die(host).click());
    expect(pips(host)).not.toBe(before);
    const sound = host.querySelector(".subject-reroll__sound");
    expect(sound?.textContent).toBe(strings.kyotoSeika.balloons.rollSound.en);
    expect(sound?.getAttribute("aria-hidden")).toBe("true");
  });

  it("under reduced motion only changes the die's pips and the clouds' words", () => {
    reduceMotion();
    const { host } = render(<Harness />);
    const words = () =>
      [...host.querySelectorAll(".subject-balloon__word")].map((w) => w.textContent).join();
    const before = { pips: pips(host), words: words() };
    act(() => die(host).click());
    expect(pips(host)).not.toBe(before.pips);
    expect(words()).not.toBe(before.words);
    expect(host.querySelector(".subject-reroll__sound")).toBeNull();
    expect(host.querySelector(".subject-pop")).toBeNull();
  });

  it("pops each cloud it deals again, its old word riding the pop as the new one takes its place, and never a pick", () => {
    const { host } = render(<Harness />);
    act(() => toggles(host)[2].click());
    const clouds = () => [...host.querySelectorAll(".subject-balloon")];
    // Each cloud's own word comes first; a pop's follows it.
    const shown = () => clouds().map((c) => c.querySelector(".subject-balloon__word")?.textContent);
    const before = shown();
    act(() => die(host).click());
    const after = shown();
    const popped = clouds().map(
      (c) => c.querySelector(".subject-pop .subject-balloon__word")?.textContent ?? null,
    );
    expect(popped).toEqual(before.map((word, place) => (after[place] === word ? null : word)));
    expect(popped[2]).toBeNull();
    expect(popped.some((word) => word !== null)).toBe(true);
  });
});

describe("a die rolled too often", () => {
  /** The clouds over a deal, then over it after the die's roll number `rolls`. */
  function rollTo(rolls: number) {
    const before: Deal = { ...DEAL, rolls: rolls - 1 };
    const spring = TEST_SUBJECTS.find((s) => s.ja === "春");
    if (!spring) throw new Error("the test list has no 春");
    const after: Deal = { ...DEAL, subjects: [spring, ...DEAL.subjects.slice(1)], rolls };
    const { host, again } = render(still(before));
    again(still(after));
    return { host, renderAgain: () => again(still(after)) };
  }

  it("teases at the first line's roll, in hand lettering, and reads it out", () => {
    const [firstRoll] = TEASE_LINES.keys();
    const { host } = rollTo(firstRoll);
    const line = strings.kyotoSeika.tease.again.en;
    expect(host.querySelector(".die-tease")?.textContent).toBe(line);
    expect(status(host)).toContain(line);
  });

  it("blows up at once on the last roll: the bang, the broken die and its smoke, and says the subjects stay", () => {
    vi.useFakeTimers();
    const { host } = rollTo(CHARRED_AT_ROLL);
    expect(host.querySelector(".die-bang__burst")).not.toBeNull();
    expect(die(host).getAttribute("aria-disabled")).toBe("true");
    expect(die(host).getAttribute("aria-label")).toBe(strings.kyotoSeika.balloons.charred.en);
    expect(die(host).classList.contains("is-broken")).toBe(true);
    expect(die(host).classList.contains("is-shaking")).toBe(false);
    expect(status(host)).toContain(strings.kyotoSeika.balloons.charred.en);
    expect(host.querySelector(".die-tease")).toBeNull();
    expect(die(host).querySelector(".subject-reroll__smoke")).not.toBeNull();
  });

  it("under reduced motion, leaves only the broken die, with no bang or smoke", () => {
    reduceMotion();
    const { host } = rollTo(CHARRED_AT_ROLL);
    expect(die(host).classList.contains("is-broken")).toBe(true);
    expect(host.querySelector(".die-bang")).toBeNull();
    expect(die(host).querySelector(".subject-reroll__smoke")).toBeNull();
  });

  it("plays the bang once, as the die blows up, however often the clouds render after", () => {
    vi.useFakeTimers();
    const { host, renderAgain } = rollTo(CHARRED_AT_ROLL);
    const burst = host.querySelector(".die-bang__burst");
    if (!burst) throw new Error("No bang");
    const played = vi.spyOn(burst, "animate");
    renderAgain();
    expect(played).not.toHaveBeenCalled();
  });

  it("charred, takes no roll, and comes back from a reload broken, with no bang", () => {
    const onRoll = vi.fn();
    const { host } = render(
      <SubjectBalloons
        deal={{ ...DEAL, rolls: CHARRED_AT_ROLL }}
        layout={LAYOUT}
        onRoll={onRoll}
        onPick={idle}
      />,
    );
    act(() => die(host).click());
    expect(onRoll).not.toHaveBeenCalled();
    expect(die(host).classList.contains("is-broken")).toBe(true);
    expect(host.querySelector(".die-bang")).toBeNull();
  });
});
