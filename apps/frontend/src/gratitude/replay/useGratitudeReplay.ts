import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { apiError, type ApiError } from "../../api/apiClient";
import { useApi } from "../../api/useApi";
import { useApiQuery } from "../../api/useApiQuery";
import { mountGratitudeReplay, type GratitudeReplayHandle } from "./mountGratitudeReplay";

/** How long the landed heart holds in its card before the stage shuts, ms. */
export const LANDED_HOLD_MS = 600;

/** Where a replay is: shut, loading on its open stage, playing, or holding its landing. */
type ReplayPhase = "idle" | "loading" | "playing" | "landed";

/** Why the last replay didn't play through: its load failed, or its frame loop did. */
type ReplayFailure = { kind: "load"; error: ApiError } | { kind: "loop"; reason: string };

interface Options {
  /** The gift whose gratitude replays; null when there's none to play. */
  giftId: string | null;
  /** The stage's host, where the engine builds its stage. */
  host: RefObject<HTMLDivElement | null>;
  /** Where the heart lands: this element's middle, read as the landing starts. */
  landOn: RefObject<HTMLElement | null>;
  /** Whether landing marks the gratitude watched: for its giver, while it's unwatched. */
  marksSeen: boolean;
  reduced: boolean;
  /** Builds the engine's stage; tests pass a fake. */
  mount?: typeof mountGratitudeReplay;
}

export interface GratitudeReplay {
  phase: ReplayPhase;
  failure: ReplayFailure | null;
  /** Marking the gratitude watched failed; the replay itself played. */
  seenFailure: ApiError | null;
  play: () => void;
  stop: () => void;
}

/** One press of Replay, until it's over. */
interface Run {
  giftId: string;
  /** Which press: each loads afresh. */
  press: number;
  landed: boolean;
}

/** The middle of `target`, px from `box`'s top left. */
function middleIn(target: Element, box: Element): { x: number; y: number } {
  const t = target.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  return { x: t.left + t.width / 2 - b.left, y: t.top + t.height / 2 - b.top };
}

/**
 * One gift's gratitude replay, wherever its card is: it loads on play, mounts the engine on the
 * open stage, and ends on its landing, Stop, Escape, another gift or the card going. The card
 * draws the controls and the words.
 */
export function useGratitudeReplay({
  giftId,
  host,
  landOn,
  marksSeen,
  reduced,
  mount = mountGratitudeReplay,
}: Options): GratitudeReplay {
  const handle = useRef<GratitudeReplayHandle | null>(null);
  const presses = useRef(0);
  /** Gifts this card marked watched, so replaying one doesn't mark it again. */
  const marked = useRef(new Set<string>());
  const [run, setRun] = useState<Run | null>(null);
  const [loopFailure, setLoopFailure] = useState<{ giftId: string; reason: string } | null>(null);
  const [seenFailure, setSeenFailure] = useState<{ giftId: string; error: ApiError } | null>(null);
  const current = run !== null && run.giftId === giftId ? run : null;

  // The engine mounts once per play, and its promise settles later: both read the latest of these.
  const api = useApi();
  const latest = useRef({ api, marksSeen, reduced, mount });
  useLayoutEffect(() => {
    latest.current = { api, marksSeen, reduced, mount };
  });

  // Fetched on press, not before, and afresh on each press: the key names the press.
  const query = useApiQuery(
    current ? `gratitude:${current.giftId}#${current.press}` : "gratitude:none",
    (client) => (current ? client.gratitude(current.giftId) : Promise.resolve(null)),
  );
  const answer = current && query.state === "ready" ? query.data : null;
  // A load that failed shuts the stage; its press is kept until the next, to say why.
  const loadFailure = current && query.state === "failed" ? query.error : null;
  const phase: ReplayPhase =
    !current || loadFailure ? "idle" : current.landed ? "landed" : answer ? "playing" : "loading";

  const release = () => {
    const playing = handle.current;
    handle.current = null;
    playing?.stop();
  };
  const stop = () => {
    release();
    setRun(null);
  };
  const play = () => {
    if (giftId === null) return;
    release();
    setLoopFailure(null);
    setSeenFailure(null);
    presses.current += 1;
    setRun({ giftId, press: presses.current, landed: false });
  };

  const markSeen = (id: string) => {
    if (!latest.current.marksSeen || marked.current.has(id)) return;
    marked.current.add(id);
    latest.current.api.markGratitudeSeen(id).catch((error: unknown) => {
      marked.current.delete(id);
      const failure = apiError(error);
      console.error(`Marking gift ${id}'s gratitude watched failed`, failure);
      setSeenFailure({ giftId: id, error: failure });
    });
  };

  // Mounts once per press: its answer is new only when that press's load lands.
  useEffect(() => {
    const box = host.current;
    if (!current || current.landed || !answer || !box) return;
    const playing = latest.current.mount(box, {
      replay: answer.replay,
      gratitude: answer.gratitude,
      landAt: () => {
        const target = landOn.current;
        const at = host.current;
        return target && at ? middleIn(target, at) : null;
      },
      reduced: latest.current.reduced,
    });
    handle.current = playing;
    playing.finished.then(
      (outcome) => {
        if (handle.current !== playing || outcome !== "landed") return;
        setRun({ ...current, landed: true });
        markSeen(current.giftId);
      },
      (error: unknown) => {
        if (handle.current !== playing) return;
        console.error(`The replay of gift ${current.giftId}'s gratitude stopped`, error);
        release();
        setRun(null);
        const reason = error instanceof Error ? error.message : String(error);
        setLoopFailure({ giftId: current.giftId, reason });
      },
    );
  }, [current, answer, host, landOn]);

  // The engine follows the setting live, mid-play included.
  useEffect(() => handle.current?.setReduced(reduced), [reduced]);

  // The landed heart holds in the card a beat, then the stage shuts.
  useEffect(() => {
    if (phase !== "landed") return;
    const shut = setTimeout(stop, LANDED_HOLD_MS);
    return () => clearTimeout(shut);
  }, [phase]);

  // Another gift in the card, or the card gone (paging remounts the Transfer Trail), ends it.
  useEffect(
    () => () => {
      release();
      setRun(null);
    },
    [giftId],
  );

  const active = phase !== "idle";
  // While it plays, Escape stops only the replay, wherever focus is: Safari leaves it off a clicked
  // button. Heard first, the detail's own Escape, which would close the detail, never hears it.
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      stop();
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [active]);

  return {
    phase,
    failure: loadFailure
      ? { kind: "load", error: loadFailure }
      : loopFailure?.giftId === giftId
        ? { kind: "loop", reason: loopFailure.reason }
        : null,
    seenFailure: seenFailure?.giftId === giftId ? seenFailure.error : null,
    play,
    stop,
  };
}
