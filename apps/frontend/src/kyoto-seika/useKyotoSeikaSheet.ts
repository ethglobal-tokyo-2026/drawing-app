import { useRef, useState } from "react";
import { drawingScreenLink } from "../app/openedView";
import type { KeptKyotoSeika, SessionKeeper } from "../sticker-creation/session/keptSession";
import { firstDeal, rollDie, type Balloon, type Deal } from "./deal";
import { keepDealt, readDealtRecently } from "./dealtRecently";
import { loadSubjectList, type KyotoSeikaSubjectEntry } from "./subjectList";

/** The subject list as the sheet has it: not asked for, on its way, in, or failed with a way to retry. */
export type SubjectListState =
  | { status: "idle" | "loading" | "loaded" }
  | { status: "failed"; error: unknown; retry: () => void };

interface Options {
  userId: string;
  /** Dark subjects too: both switches are on. */
  dark: boolean;
  keeper: SessionKeeper;
}

/**
 * The deal of a sheet whose ticket was spent in Kyoto Seika Manga Expression Practice Mode: the list,
 * the pair with each die's rolls, and Begin, each kept with the drawing in progress as it changes.
 */
export function useKyotoSeikaSheet({ userId, dark, keeper }: Options) {
  const [list, setList] = useState<SubjectListState>({ status: "idle" });
  const [deal, setDeal] = useState<Deal | null>(null);
  const [begun, setBegun] = useState(false);
  // Each open is its own sheet: a load that answers after the sheet moved on is dropped.
  const opened = useRef(0);
  const subjects = useRef<readonly KyotoSeikaSubjectEntry[] | null>(null);
  const part = useRef<KeptKyotoSeika | null>(null);

  const keep = (next: KeptKyotoSeika) => {
    part.current = next;
    keeper.keepKyotoSeika(next);
    setDeal(next.subjects && { subjects: next.subjects, rolls: next.rolls });
    setBegun(next.begun);
  };
  const options = () => ({ recent: readDealtRecently(userId), dark, random: Math.random });

  const load = (sheet: number) => {
    setList({ status: "loading" });
    loadSubjectList().then(
      (loaded) => {
        if (sheet !== opened.current) return;
        subjects.current = loaded.subjects;
        setList({ status: "loaded" });
        if (part.current?.subjects) return;
        const fresh = firstDeal(loaded.subjects, options());
        keepDealt(
          userId,
          fresh.subjects.map((s) => s.ja),
        );
        keep({ subjects: fresh.subjects, rolls: fresh.rolls, begun: false });
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

  /** A ticket spent in the mode landed (`kept` null), or a kept sheet came back: deal, or deal again. */
  const open = (kept: KeptKyotoSeika | null) => {
    const sheet = ++opened.current;
    part.current = kept ?? { subjects: null, rolls: [0, 0], begun: false };
    setDeal(kept?.subjects ? { subjects: kept.subjects, rolls: kept.rolls } : null);
    setBegun(kept?.begun ?? false);
    // A begun pair is locked in, so its dice never roll again.
    if (kept?.begun) setList({ status: "idle" });
    else load(sheet);
  };

  const roll = (balloon: Balloon) => {
    const current = part.current;
    if (!subjects.current || !current?.subjects || current.begun) return;
    const next = rollDie(
      subjects.current,
      { subjects: current.subjects, rolls: current.rolls },
      balloon,
      options(),
    );
    if (!next) return;
    keepDealt(userId, [next.subjects[balloon].ja]);
    keep({ subjects: next.subjects, rolls: next.rolls, begun: false });
  };

  /** Begin locked the pair in. */
  const begin = () => {
    if (part.current?.subjects) keep({ ...part.current, begun: true });
  };

  /** The sheet is done with: a fresh one deals afresh. */
  const close = () => {
    opened.current++;
    part.current = null;
    setDeal(null);
    setBegun(false);
    setList({ status: "idle" });
  };

  return { list, deal, begun, open, roll, begin, close };
}
