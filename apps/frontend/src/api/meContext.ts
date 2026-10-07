import { createContext, useContext } from "react";
import type { Me } from "@drawing-app/api/client";

export const MeContext = createContext<Me | null>(null);
export const SetMeContext = createContext<((me: Me) => void) | null>(null);

/** You, as the server knows you, inside SessionGate. */
export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe() needs a SessionGate above it");
  return me;
}

/** Replaces you with the server's newer answer, as a setting saved on the Settings note does. */
export function useSetMe(): (me: Me) => void {
  const setMe = useContext(SetMeContext);
  if (!setMe) throw new Error("useSetMe() needs a SessionGate above it");
  return setMe;
}
