import { useLayoutEffect, useState } from "react";
import { useReducedMotion } from "../../ui/useReducedMotion";
import type { LayerId } from "../canvas/ops";

interface State {
  current: LayerId;
  hidden: boolean;
  suppressed: boolean;
  generation: number;
}

interface Episode extends State {
  phase: "visible" | "leaving" | null;
  announced: boolean;
  hovered: boolean;
  focused: boolean;
  used: boolean;
  remaining: number;
  deadline: number;
}

const freshEpisode = (state: State): Episode => ({
  ...state,
  phase: null,
  announced: false,
  hovered: false,
  focused: false,
  used: false,
  remaining: 5000,
  deadline: 0,
});

/** Recovery belongs to one selected hidden layer in one drawing. */
export function useHiddenLayerGuidance(state: State) {
  const { current, hidden, suppressed, generation } = state;
  const reducedMotion = useReducedMotion();
  const [episode, setEpisode] = useState(() => freshEpisode(state));
  if (
    episode.current !== current ||
    episode.hidden !== hidden ||
    episode.generation !== generation
  ) {
    setEpisode(freshEpisode(state));
  } else if (episode.suppressed !== suppressed) {
    setEpisode({
      ...episode,
      suppressed,
      phase: suppressed ? null : episode.phase,
      hovered: false,
      focused: false,
    });
  }
  const { phase, deadline } = episode;
  const paused = episode.hovered || episode.focused;

  useLayoutEffect(() => {
    if (!phase || suppressed || !hidden) return;
    if (paused) return;
    const delay = phase === "visible" ? Math.max(0, deadline - Date.now()) : 150;
    const timeout = setTimeout(() => {
      setEpisode((before) => {
        // A queued timeout cannot dismiss another selection or a replacement drawing.
        if (
          before.current !== current ||
          before.generation !== generation ||
          before.deadline !== deadline ||
          before.phase !== phase ||
          before.hovered ||
          before.focused ||
          before.suppressed
        )
          return before;
        return { ...before, phase: phase === "visible" && !reducedMotion ? "leaving" : null };
      });
    }, delay);
    return () => clearTimeout(timeout);
  }, [phase, deadline, paused, suppressed, hidden, reducedMotion, current, generation]);

  const setInteraction = (key: "hovered" | "focused", value: boolean) => {
    setEpisode((before) => {
      if (!before.phase || before[key] === value) return before;
      const wasPaused = before.hovered || before.focused;
      const next = { ...before, [key]: value };
      const nowPaused = next.hovered || next.focused;
      if (!wasPaused && nowPaused) {
        next.remaining = before.phase === "visible" ? Math.max(0, before.deadline - Date.now()) : 0;
        // Entering during the fade keeps the recovery control the person is using.
        next.phase = "visible";
      } else if (wasPaused && !nowPaused) {
        next.deadline = Date.now() + Math.max(1000, before.remaining);
      }
      return next;
    });
  };

  return {
    phase: suppressed || !hidden ? null : phase,
    announced: episode.announced,
    onBlocked: () => {
      setEpisode((before) => {
        if (!before.hidden || before.suppressed || before.used) return before;
        return {
          ...before,
          used: true,
          announced: true,
          phase: "visible",
          deadline: Date.now() + 5000,
        };
      });
    },
    onHover: (hovered: boolean) => setInteraction("hovered", hovered),
    onFocus: (focused: boolean) => setInteraction("focused", focused),
    dismiss: () =>
      setEpisode((before) => ({ ...before, phase: null, hovered: false, focused: false })),
  };
}
