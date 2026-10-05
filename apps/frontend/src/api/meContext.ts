import { createContext, useContext } from "react";
import type { Me } from "@drawing-app/api/client";

export const MeContext = createContext<Me | null>(null);

/** You, as the server knows you, inside SessionGate. */
export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe() needs a SessionGate above it");
  return me;
}
