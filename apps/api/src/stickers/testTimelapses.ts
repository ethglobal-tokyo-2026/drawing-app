import { timelapseV1ToV2 } from "@drawing-app/db";
import { timelapseV2Schema, type TimelapseV2 } from "./timelapse.ts";

/**
 * For the app's tests: a v1 timelapse's JSON as sealing stores it, converted to v2 and read back.
 * Throws when it isn't v1. It goes with sealing's v1 bridge.
 */
export const storedFromV1 = (json: unknown): TimelapseV2 =>
  timelapseV2Schema.parse(timelapseV1ToV2(json));
