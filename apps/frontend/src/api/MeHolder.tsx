import type { Me } from "@drawing-app/api/client";
import { useImperativeHandle, useState, type ReactNode, type Ref } from "react";
import { MeContext, SetMeContext } from "./meContext";

/** You in tests, starting as `me`, whom useSetMe and `replace` replace as SessionGate does. */
export function MeHolder({
  me,
  replace,
  children,
}: {
  me: Me;
  replace: Ref<(me: Me) => void>;
  children: ReactNode;
}) {
  const [current, setCurrent] = useState(me);
  useImperativeHandle(replace, () => setCurrent, []);
  return (
    <MeContext value={current}>
      <SetMeContext value={setCurrent}>{children}</SetMeContext>
    </MeContext>
  );
}
