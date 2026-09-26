import { useContext } from "react";
import { MeContext } from "../api/meContext";
import type { AgeStatus } from "@drawing-app/api/client";

/** Your age status, from your age verification; unknown outside a session. */
export function useMyAgeStatus(): AgeStatus {
  return useContext(MeContext)?.ageStatus ?? "unknown";
}
