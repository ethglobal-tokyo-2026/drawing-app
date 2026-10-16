import { useEffect, useMemo, useState } from "react";
import { apiError, type ApiError } from "../api/apiClient";
import { useSessionEnvelope } from "../api/sessionContext";
import { useApi } from "../api/useApi";

/** What failed, with a way to try again: the marks' load, or a mark or unmark of `word`. */
export type MarksFailure = { error: ApiError; retry: () => void } & (
  | { kind: "load" }
  | { kind: "mark" | "unmark"; word: string }
);

/** The operator's marks on Kyoto Seika Subjects while a deal is open. */
export interface SubjectMarks {
  /** The words marked for deletion from the subject list, by their `ja`. */
  marked: ReadonlySet<string>;
  /** Marks `word` or takes its mark off, on screen at once; a refusal puts it back as it was. */
  toggle: (word: string) => void;
  failure: MarksFailure | null;
}

/**
 * The words the operator marked for deletion, loaded as a deal opens, and the marks a hold makes. Null
 * for anyone else, the operator acting as Hana included, who sends nothing.
 */
export function useSubjectsMarkedForDeletion(): SubjectMarks | null {
  const api = useApi();
  const operator = useSessionEnvelope().marksKyotoSeikaSubjects;
  const [loaded, setLoaded] = useState<readonly string[]>([]);
  // This deal's holds, over the loaded words, so a load that lands after a hold doesn't undo it.
  const [held, setHeld] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [failure, setFailure] = useState<MarksFailure | null>(null);
  const [loads, setLoads] = useState(0);

  useEffect(() => {
    if (!operator) return;
    let current = true;
    api.subjectsMarkedForDeletion().then(
      (words) => {
        if (current) setLoaded(words);
      },
      (error: unknown) => {
        if (!current) return;
        const failed = apiError(error);
        console.error("Loading the Kyoto Seika Subjects marked for deletion failed", failed);
        const retry = () => {
          setFailure(null);
          setLoads((n) => n + 1);
        };
        setFailure({ kind: "load", error: failed, retry });
      },
    );
    return () => {
      current = false;
    };
  }, [api, operator, loads]);

  const marked = useMemo(() => {
    const words = new Set(loaded);
    for (const [word, on] of held) {
      if (on) words.add(word);
      else words.delete(word);
    }
    return words;
  }, [loaded, held]);

  const change = (word: string, marking: boolean) => {
    setHeld((now) => new Map(now).set(word, marking));
    setFailure((was) => (was && was.kind !== "load" && was.word === word ? null : was));
    const sent = marking ? api.markSubjectForDeletion(word) : api.unmarkSubjectForDeletion(word);
    sent.catch((error: unknown) => {
      const failed = apiError(error);
      console.error(`${marking ? "Marking" : "Unmarking"} ${word} for deletion failed`, failed);
      setHeld((now) => new Map(now).set(word, !marking));
      setFailure({
        kind: marking ? "mark" : "unmark",
        word,
        error: failed,
        retry: () => change(word, marking),
      });
    });
  };

  if (!operator) return null;
  return { marked, toggle: (word) => change(word, !marked.has(word)), failure };
}
