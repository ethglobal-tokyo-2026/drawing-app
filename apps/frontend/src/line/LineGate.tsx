import type { ReactNode } from "react";
import { Key } from "../ui/Key";
import { lineLogin, useLine } from "./liff";
import "./LineGate.css";

/** Holds the app until LINE has logged the person in, and says so when it can't. */
export function LineGate({ children }: { children: ReactNode }) {
  const line = useLine();
  if (line.status === "ready") return children;
  // LIFF usually settles within a second; the bare Liner page stands in until then.
  if (line.status === "loading") return null;
  return (
    <main className="line-gate">
      {line.status === "logged-out" ? (
        <>
          <h1 className="title-label">Your sticker board</h1>
          <p>It opens with your LINE account.</p>
          <Key onClick={lineLogin}>Log in with LINE</Key>
        </>
      ) : (
        <>
          <h1 className="title-label">LINE didn’t start</h1>
          <p className="line-gate-error">{line.message}</p>
          <Key onClick={() => location.reload()}>Try again</Key>
        </>
      )}
    </main>
  );
}
