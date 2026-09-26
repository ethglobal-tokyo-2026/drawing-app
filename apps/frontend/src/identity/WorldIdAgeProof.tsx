import type { AgeProof, AgeVerificationRequest } from "@drawing-app/api/client";
import {
  IDKitErrorCodes,
  IDKitRequestWidget,
  proofOfHuman,
  type IDKitResult,
} from "@worldcoin/idkit";
import { createPortal } from "react-dom";

/** An action's proof with its nullifiers, the kind age verification takes; the server checks the rest. */
const isAgeProof = (result: IDKitResult): result is IDKitResult & AgeProof =>
  "action" in result &&
  result.action !== undefined &&
  result.responses.every((response) => "nullifier" in response);

/**
 * Why World ID closed, when it failed: World App sent a proof of something other than the action,
 * or World App failed with IDKit's code. `failed_by_host_app` is our own onProof's rejection.
 */
export type WorldIdFailure = { kind: "other-proof" } | { kind: "world-app"; code: IDKitErrorCodes };

/** IDKit's codes for the person closing World ID themselves, which aren't failures. */
const STOPPED_BY_PERSON: ReadonlySet<IDKitErrorCodes> = new Set([
  IDKitErrorCodes.UserRejected,
  IDKitErrorCodes.Cancelled,
]);

interface Props {
  request: AgeVerificationRequest;
  /** Sends World App's proof to our server; a rejection shows as IDKit's failure. */
  onProof: (proof: AgeProof) => Promise<void>;
  /** Closed: done, or closed by the person, or with why it failed. */
  onClose: (failure: WorldIdFailure | null) => void;
}

/**
 * IDKit's widget, asking World App for an Orb-verified World ID's proof, which shows the person is 18
 * or older. It sits on the page's body, since the turning cork would carry an overlay.
 */
export function WorldIdAgeProof({ request, onProof, onClose }: Props) {
  return createPortal(
    <IDKitRequestWidget
      open
      onOpenChange={(open) => {
        if (!open) onClose(null);
      }}
      app_id={request.appId}
      action={request.action}
      rp_context={request.rpContext}
      environment={request.environment}
      // Many Orb-verified World IDs are still 3.0 ones.
      allow_legacy_proofs
      preset={proofOfHuman()}
      handleVerify={async (result) => {
        if (isAgeProof(result)) return onProof(result);
        onClose({ kind: "other-proof" });
        throw new Error("World App sent a proof without the action's nullifiers");
      }}
      onSuccess={() => onClose(null)}
      onError={(code) => onClose(STOPPED_BY_PERSON.has(code) ? null : { kind: "world-app", code })}
    />,
    document.body,
  );
}
