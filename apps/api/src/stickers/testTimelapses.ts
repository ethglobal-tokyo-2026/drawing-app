import { normalizeTimelapse } from "@drawing-app/db";
import { timelapseV3Schema, type TimelapseV3 } from "./timelapse.ts";

/**
 * For the app's tests: a v1 timelapse's JSON as sealing stores it, converted to v3 and read back.
 * Throws when it isn't v1. It goes with sealing's v1 bridge.
 */
export const storedFromV1 = (json: unknown): TimelapseV3 =>
  timelapseV3Schema.parse(normalizeTimelapse(json));
