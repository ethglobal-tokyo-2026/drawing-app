import { useMemo, useSyncExternalStore } from "react";
import { ApiError } from "../api/apiClient";
import { parseStored, personKey, readStored, writeStored } from "../ui/deviceStorage";

/**
 * Why the server refused the gratitude for one gift for good, kept on this device until the person
 * dismisses it. A refusal can come after the receipt has gone, as a resend once the phone is back
 * online, so the gift's sticker detail says it. One list per person, one refusal per gift.
 */
export interface GratitudeRefusal {
  giftId: string;
  /** The refusing answer's status, code and the server's English words, as an ApiError holds them. */
  status: number;
  code: string;
  detail?: string;
}

const keyFor = (userId: string) => personKey("draw.gratitude.refused", userId);
const READ_FAILURE = "Gratitude refusals kept on this device can't be read";

const isRefusal = (value: unknown): value is GratitudeRefusal =>
  typeof value === "object" &&
  value !== null &&
  "giftId" in value &&
  typeof value.giftId === "string" &&
  "status" in value &&
  typeof value.status === "number" &&
  "code" in value &&
  typeof value.code === "string" &&
  (!("detail" in value) || typeof value.detail === "string");

/** The refusals in storage's `text`. What can't be read is logged whole and isn't shown. */
function parseRefusals(text: string | null): GratitudeRefusal[] {
  if (text === null) return [];
  const value = parseStored(text);
  const refusals = Array.isArray(value) ? value.filter(isRefusal) : [];
  if (!Array.isArray(value) || refusals.length !== value.length) {
    console.error(
      "Gratitude refusals kept on this device are unreadable, so they aren't shown:",
      text,
    );
  }
  return refusals;
}

/** `userId`'s refusals as storage has them; none when storage can't be read. */
export const readGratitudeRefusals = (userId: string): GratitudeRefusal[] =>
  parseRefusals(readStored(keyFor(userId), READ_FAILURE).text);

/** Screens showing refusals, told whenever any person's change. */
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

function write(userId: string, refusals: readonly GratitudeRefusal[], giftId: string) {
  writeStored(
    keyFor(userId),
    refusals.length === 0 ? null : JSON.stringify(refusals),
    `The refusals of gratitude kept on this device can't be saved (gift ${giftId})`,
  );
  for (const listener of listeners) listener();
}

/** Keeps why the server refused `userId`'s gratitude for `giftId`, in place of any earlier refusal. */
export function keepGratitudeRefusal(
  userId: string,
  giftId: string,
  { status, code, detail }: ApiError,
): void {
  const refusal: GratitudeRefusal =
    detail === undefined ? { giftId, status, code } : { giftId, status, code, detail };
  write(
    userId,
    [...readGratitudeRefusals(userId).filter((r) => r.giftId !== giftId), refusal],
    giftId,
  );
}

/** Lets `giftId`'s refusal go: the person dismissed it, or the gift's gratitude has since been recorded. */
export function forgetGratitudeRefusal(userId: string, giftId: string): void {
  const refusals = readGratitudeRefusals(userId);
  if (refusals.some((r) => r.giftId === giftId)) {
    write(
      userId,
      refusals.filter((r) => r.giftId !== giftId),
      giftId,
    );
  }
}

/** The refusal as the error the server answered, to word it. */
export const refusalError = ({ status, code, detail }: GratitudeRefusal): ApiError =>
  new ApiError(status, { error: code, detail });

/** `userId`'s refusals as they are, following their being kept and let go; none without a person. */
export function useGratitudeRefusals(userId: string | null): readonly GratitudeRefusal[] {
  // Storage's text is the snapshot, so it stays the same until a refusal is kept or let go.
  const text = useSyncExternalStore(subscribe, () =>
    userId === null ? null : readStored(keyFor(userId), READ_FAILURE).text,
  );
  return useMemo(() => parseRefusals(text), [text]);
}
