import type { Me } from "@drawing-app/api/client";
import { useState, type ReactNode } from "react";
import { MeContext, SetMeContext } from "./meContext";

/** You in tests, starting as `me`, whom useSetMe replaces as SessionGate does. */
export function MeHolder({ me, children }: { me: Me; children: ReactNode }) {
  const [current, setCurrent] = useState(me);
  return (
    <MeContext value={current}>
      <SetMeContext value={setCurrent}>{children}</SetMeContext>
    </MeContext>
  );
}
