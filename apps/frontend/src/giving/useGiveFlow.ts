import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  createGiveFlow,
  type GiveFlow,
  type GiveFlowOptions,
  type GiveFlowState,
} from "./giveFlow";

const BEFORE_START: GiveFlowState = { step: "sheet" };

/** Runs one give flow while mounted; closing leaves an unsent sticker in its gift. */
export function useGiveFlow(makeOptions: () => GiveFlowOptions): {
  state: GiveFlowState;
  flow: GiveFlow | null;
} {
  const make = useRef(makeOptions);
  const [flow, setFlow] = useState<GiveFlow | null>(null);

  // Made in an effect, not during render, so a remount (StrictMode's included) gets a fresh flow.
  useEffect(() => {
    const made = createGiveFlow(make.current());
    setFlow(made);
    return () => made.dispose();
  }, []);

  const subscribe = useCallback(
    (listener: () => void) => flow?.subscribe(listener) ?? (() => {}),
    [flow],
  );
  const state = useSyncExternalStore(subscribe, () => flow?.getState() ?? BEFORE_START);
  return { state, flow };
}
