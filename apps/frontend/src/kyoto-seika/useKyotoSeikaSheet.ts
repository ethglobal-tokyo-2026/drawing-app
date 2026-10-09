import { useMemo, useRef, useState } from "react";
import { drawingScreenLink } from "../app/openedView";
import {
  UNDEALT,
  type KeptKyotoSeika,
  type SessionKeeper,
} from "../sticker-creation/session/keptSession";
import { fillDeal, firstDeal, pickedPair, rollDie, togglePick, type Deal } from "./deal";
import { keepDealt, readDealtRecently } from "./dealtRecently";
import { KINDS, loadSubjectList, type KyotoSeikaSubjectEntry } from "./subjectList";

/** The subject list as the sheet has it: not asked for, on its way, in, or failed with a way to retry. */
export type SubjectListState =
  | { status: "idle" | "loading" }
  | { status: "loaded"; subjects: readonly KyotoSeikaSubjectEntry[] }
  | { status: "failed"; error: unknown; retry: () => void };

interface Options {
  userId: string;
  keeper: SessionKeeper;
}

/** The deal a kept part holds, or null before the list deals. */
const dealOf = ({ subjects, picked, rolls }: KeptKyotoSeika): Deal | null =>
  subjects && { subjects, picked, rolls };

/**
 * The deal of a sheet whose ticket was spent in Kyoto Seika Manga Expression Practice Mode: the list,
 * the subjects with the picks and the die's rolls, and Begin, each kept with the drawing in progress as
 * it changes.
 */
export function useKyotoSeikaSheet({ userId, keeper }: Options) {
  const [list, setList] = useState<SubjectListState>({ status: "idle" });
  const [deal, setDeal] = useState<Deal | null>(null);
  const [begun, setBegun] = useState(false);
  const [seed, setSeed] = useState(0);
  // Each open is its own sheet: a load that answers after the sheet moved on is dropped.
  const opened = useRef(0);
  const subjects = useRef<readonly KyotoSeikaSubjectEntry[] | null>(null);
  const part = useRef<KeptKyotoSeika | null>(null);

  const keep = (next: KeptKyotoSeika) => {
    part.current = next;
    keeper.keepKyotoSeika(next);
    setDeal(dealOf(next));
    setBegun(next.begun);
  };
  const options = () => ({ recent: readDealtRecently(userId), random: Math.random });

  const load = (sheet: number) => {
    setList({ status: "loading" });
    loadSubjectList().then(
      (loaded) => {
        if (sheet !== opened.current) return;
        subjects.current = loaded.subjects;
        setList({ status: "loaded", subjects: loaded.subjects });
        const kept = part.current;
        if (!kept?.subjects) {
          const fresh = firstDeal(loaded.subjects, options());
          keepDealt(
            userId,
            fresh.subjects.map((s) => s.ja),
          );
          keep({ ...fresh, begun: false });
          return;
        }
        // A sheet kept by a build that dealt a pair gets the rest of the kinds round it.
        if (kept.subjects.length >= KINDS.length) return;
        const filled = fillDeal(loaded.subjects, kept.subjects, options());
        keepDealt(
          userId,
          filled.slice(kept.subjects.length).map((s) => s.ja),
        );
        keep({ ...kept, subjects: filled });
      },
      // loadSubjectList logs the failure; the sheet shows it, with a way to try again. A browser keeps
      // a failed module fetch for the page's life, so only a fresh page loads the list: one on the
      // drawing screen, which picks this sheet back up from the device.
      (error: unknown) => {
        if (sheet === opened.current)
          setList({ status: "failed", error, retry: () => location.replace(drawingScreenLink()) });
      },
    );
  };

  /**
   * A ticket spent in the mode landed (`kept` null), or a kept sheet came back: deal, or deal again.
   * `ticket` is the sheet's ticket use, which seats the deal's clouds the same after a reload.
   */
  const open = (ticket: number, kept: KeptKyotoSeika | null) => {
    const sheet = ++opened.current;
    setSeed(ticket);
    part.current = kept ?? UNDEALT;
    setDeal(kept && dealOf(kept));
    setBegun(kept?.begun ?? false);
    // A begun pair is locked in, so its die never rolls again.
    if (kept?.begun) setList({ status: "idle" });
    else load(sheet);
  };

  /** The deal while it waits for Begin, or null before it's dealt and once begun. */
  const waiting = () => {
    const current = part.current;
    return current && !current.begun ? dealOf(current) : null;
  };

  /** The die rolls: every subject not picked is dealt again. */
  const roll = () => {
    const now = waiting();
    if (!subjects.current || !now) return;
    const next = rollDie(subjects.current, now, options());
    if (!next) return;
    keepDealt(
      userId,
      next.subjects.filter((s, place) => s !== now.subjects[place]).map((s) => s.ja),
    );
    keep({ ...next, begun: false });
  };

  /** A tap on the subject at `place` picks or unpicks it; one past the picks the test asks for is refused. */
  const pick = (place: number) => {
    const now = waiting();
    const next = now && togglePick(now, place);
    if (next) keep({ ...next, begun: false });
  };

  /** Begin locked the picked pair in: the deal keeps it alone. */
  const begin = () => {
    const now = waiting();
    const picked = now && pickedPair(now);
    if (now && picked) keep({ subjects: picked, picked: [0, 1], rolls: now.rolls, begun: true });
  };

  /** The sheet is done with: a fresh one deals afresh. */
  const close = () => {
    opened.current++;
    part.current = null;
    setDeal(null);
    setBegun(false);
    setList({ status: "idle" });
  };

  // Begin's pair: what the corner print, the canvas's name and the seal carry. Kept as one value per
  // deal, so what it's handed to only changes when the deal does.
  const pair = useMemo(() => (begun && deal ? pickedPair(deal) : null), [begun, deal]);
  return { list, deal, begun, pair, seed, open, roll, pick, begin, close };
}
