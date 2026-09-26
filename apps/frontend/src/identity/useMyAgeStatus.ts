import { useContext } from "react";
import { MeContext } from "../api/meContext";
import { readNsfwDemo } from "../stickers/nsfwDemo";
import { ageStatusOf, type AgeStatus } from "./ageStatus";

/** Your age status: the developer slip's override, or your own as others see it. */
export function useMyAgeStatus(): AgeStatus {
  const me = useContext(MeContext);
  const override = readNsfwDemo().myAgeStatus;
  if (override) return override;
  return me ? ageStatusOf(me) : "unknown";
}
