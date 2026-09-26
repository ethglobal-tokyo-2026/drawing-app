import type { ReactNode } from "react";
import { Key } from "../ui/Key";
import { lineLogin, useLine } from "./liff";
import "./LineGate.css";

/** Holds the app until LINE has logged the person in, and says so when it can't. */
export function LineGate({ children }: { children: ReactNode }) {
  const line = useLine();
  if (line.status === "ready") return children;
  return (
    <main className="line-gate" aria-busy={line.status === "loading"}>
      {line.status === "loading" ? (
        <p className="fine line-gate__opening" role="status">
          Opening your sticker board…
        </p>
      ) : line.status === "logged-out" ? (
        <>
          <h1 className="title-label">Your sticker board</h1>
          <p className="line-gate__lead">It opens with your LINE account.</p>
          <Key onClick={lineLogin}>Log in with LINE</Key>
        </>
      ) : (
        <>
          <h1 className="title-label">LINE didn’t start</h1>
          <p className="line-gate__lead">
            Your sticker board opens once it does. Check your connection, then try again.
          </p>
          <Key onClick={() => location.reload()}>Try again</Key>
          <p className="fine line-gate__reason">{line.message}</p>
        </>
      )}
    </main>
  );
}
