import type { AgeProof, AgeVerificationRequest } from "@drawing-app/api/client";
import { Suspense, useId, useRef, useState } from "react";
import { apiError, type ApiError } from "../../api/apiClient";
import { useMe, useSetMe } from "../../api/meContext";
import { useApi } from "../../api/useApi";
import { errorReason } from "../../i18n/errorMessage";
import { useTranslation } from "../../i18n/react";
import { SealCheck } from "../../icons";
import type { WorldIdFailure } from "../../identity/WorldIdAgeProof";
import { LabelButton } from "../../ui/LabelButton";
import { lazyWithPreload } from "../../ui/lazyWithPreload";
import "./age-verification-note.css";

// IDKit and its WebAssembly load only when someone asks to verify.
const WorldIdAgeProof = lazyWithPreload("World ID", () =>
  import("../../identity/WorldIdAgeProof").then((module) => module.WorldIdAgeProof),
);

type Status =
  | { step: "idle" }
  | { step: "opening" }
  | { step: "open"; request: AgeVerificationRequest }
  | { step: "failed"; problem: string };

/**
 * Age verification, a paper on your cork: an Orb-verified World ID proves you're 18 or older, and
 * the server keeps only that it did, and when.
 */
export function AgeVerificationNote() {
  const { t } = useTranslation();
  const api = useApi();
  const me = useMe();
  const setMe = useSetMe();
  const id = useId();
  const [status, setStatus] = useState<Status>({ step: "idle" });
  // Our server's refusal of World App's proof, which IDKit reports only as failed_by_host_app.
  const refused = useRef<ApiError | null>(null);
  const worldIdOpen = useRef(false);

  const failed = (reason: string) =>
    setStatus({
      step: "failed",
      problem: t(($) => $.stickerBoard.ageVerification.failed, { reason }),
    });

  const open = async () => {
    setStatus({ step: "opening" });
    refused.current = null;
    try {
      const [request] = await Promise.all([
        api.ageVerificationRequest(),
        WorldIdAgeProof.preload(),
      ]);
      worldIdOpen.current = true;
      setStatus({ step: "open", request });
    } catch (error) {
      console.error("Age verification couldn't open World ID", error);
      failed(errorReason(apiError(error)));
    }
  };

  const sendProof = async (proof: AgeProof) => {
    try {
      setMe(await api.verifyAge(proof));
    } catch (error) {
      const failure = apiError(error);
      console.error("The server didn't take World App's age proof", failure);
      refused.current = failure;
      throw failure;
    }
  };

  const closed = (failure: WorldIdFailure | null) => {
    // IDKit can report a close after the one that already settled the paper.
    if (!worldIdOpen.current) return;
    worldIdOpen.current = false;
    if (!failure) {
      setStatus({ step: "idle" });
      return;
    }
    console.error("World ID failed", failure);
    failed(
      refused.current
        ? errorReason(refused.current)
        : failure.kind === "other-proof"
          ? t(($) => $.stickerBoard.ageVerification.otherProof)
          : t(($) => $.stickerBoard.ageVerification.worldAppFailed, { code: failure.code }),
    );
  };

  const verified = me.ageVerifiedAt !== null;
  return (
    <section className="stat-board__note age-verification-note" aria-labelledby={`${id}-title`}>
      <div className="stat-board__paper">
        <h3 className="age-verification-note__title" id={`${id}-title`}>
          {t(($) => $.stickerBoard.ageVerification.title)}
        </h3>
        {verified ? (
          <p className="age-verification-note__verified">
            <SealCheck weight="fill" aria-hidden />
            {t(($) => $.stickerBoard.ageVerification.verified)}
          </p>
        ) : (
          <>
            <p className="age-verification-note__lead">
              {t(($) => $.stickerBoard.ageVerification.lead)}
            </p>
            <LabelButton
              size="sm"
              tone="ink"
              block
              aria-busy={status.step === "opening"}
              disabled={status.step === "opening" || status.step === "open"}
              onClick={() => void open()}
            >
              {status.step === "opening"
                ? t(($) => $.stickerBoard.ageVerification.opening)
                : t(($) => $.stickerBoard.ageVerification.verify)}
            </LabelButton>
          </>
        )}
        {status.step === "failed" && !verified && (
          <p className="age-verification-note__problem" role="alert">
            {status.problem}
          </p>
        )}
      </div>
      <i className="stat-board__pin" aria-hidden />
      {status.step === "open" && (
        <Suspense>
          <WorldIdAgeProof request={status.request} onProof={sendProof} onClose={closed} />
        </Suspense>
      )}
    </section>
  );
}
