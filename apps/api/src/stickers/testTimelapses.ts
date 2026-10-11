import { normalizeTimelapse } from "@drawing-app/db";
import { timelapseV4Schema, type TimelapseV4 } from "./timelapse.ts";

/**
 * For the app's tests: a v1 timelapse's JSON as sealing stores it, converted to v4 and read back.
 * Throws when it isn't v1. It goes with sealing's v1 bridge.
 */
export const storedFromV1 = (json: unknown): TimelapseV4 =>
  timelapseV4Schema.parse(normalizeTimelapse(json));
