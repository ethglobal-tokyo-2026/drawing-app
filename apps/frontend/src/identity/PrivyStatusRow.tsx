import { QuietLink } from "../ui/QuietLink";
import { retryPrivySignIn, usePrivyStatus } from "./privy";
import "./privy-status.css";

/** The Privy sign-in, as one row of a <dl>. */
export function PrivyStatusRow() {
  const privy = usePrivyStatus();
  return (
    <div>
      <dt>Privy</dt>
      <dd className="privy-status">
        {privy.state === "signed-in" ? (
          <>
            Signed in <span className="mono">{privy.userId}</span>
          </>
        ) : privy.state === "failed" ? (
          <>
            <span className="soft">{privy.reason}</span>
            <QuietLink onClick={retryPrivySignIn}>Try again</QuietLink>
          </>
        ) : (
          <span className="soft">
            {privy.state === "signing-in" ? "Signing in…" : `Off: ${privy.reason}`}
          </span>
        )}
      </dd>
    </div>
  );
}
