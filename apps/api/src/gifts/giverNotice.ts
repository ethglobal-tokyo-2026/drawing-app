import { gifts, users, type Db } from "@drawing-app/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { MessagingChannel } from "../chatMenu/fromEnvironment.ts";
import type { Clock, GiverNotice } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import type { Schedule } from "../midnightJob.ts";
import { startRepeatingJob } from "../repeatingJob.ts";
import {
  LineApiError,
  RETRY_KEY_KEPT_MS,
  retryKeyFor,
  type LineMessaging,
} from "../services/lineMessaging.ts";

/**
 * How long after Receiving a message that failed is retried: short of how long LINE keeps its retry
 * key, so the last retry reaches LINE while LINE still knows the key.
 */
export const RETRY_WINDOW_MS = RETRY_KEY_KEPT_MS - 60 * 60_000;
/** Between the sweeps that retry what failed. */
export const SWEEP_EVERY_MS = 10 * 60_000;

type Language = (typeof users.$inferSelect)["language"];

/** The message's words, in the frontend catalog's shape: without `ja`, Japanese says the English. */
const GIVER_NOTICE_TEXT = {
  /** LINE, the Official account's chat: the giver's message once someone received their gift; {{name}} is the receiver's @handle, or their LINE name without one */
  received: {
    en: "{{name}} received your sticker ♡",
    ja: "{{name}}があなたのシールを受け取りました♡",
  },
  /** LINE, the Official account's chat: {{name}} in the giver's message, for a receiver whose account is deleted */
  someone: { en: "Someone", ja: "だれか" },
} satisfies Record<string, { en: string; ja?: string }>;

const inLanguage = (text: { en: string; ja?: string }, language: Language) =>
  language === "ja" ? (text.ja ?? text.en) : text.en;

/** The receiver as the app names them: their @handle, else their LINE name, else someone. */
function receiverName(
  receiver: { handle: string | null; lineDisplayName: string | null },
  language: Language,
) {
  if (receiver.handle !== null) return `@${receiver.handle}`;
  return receiver.lineDisplayName ?? inLanguage(GIVER_NOTICE_TEXT.someone, language);
}

/** The message a giver who reads `language` gets once `name` received their gift. */
export const receivedText = (language: Language, name: string) =>
  // A function, so a `$` in someone's name is kept as written.
  inLanguage(GIVER_NOTICE_TEXT.received, language).replace("{{name}}", () => name);

/** The retry key of a gift's message: made from the gift, and that it was received. */
export const receivedRetryKey = (giftId: string) => retryKeyFor(`gift ${giftId} received`);

/** The giver's messages with no channel to send them through: every call does nothing. */
export const giverNoticeOff: GiverNotice = {
  send: () => Promise.resolve(),
  sweep: () => Promise.resolve(),
  idle: () => Promise.resolve(),
};

/**
 * Sends each giver the Official account's message that their gift was received, through the
 * Messaging API channel. A gift's message is sent once at a time, and pushed_to_giver_at is set
 * once LINE takes it or it's given up, so a sweep finds only what's still due.
 */
export function createGiverNotice({
  db,
  clock,
  line,
}: {
  db: Db;
  clock: Clock;
  line: Pick<LineMessaging, "pushText">;
}): GiverNotice {
  const giver = alias(users, "giver");
  const receiver = alias(users, "receiver");
  const sending = new Map<string, Promise<void>>();
  let sweeping: Promise<void> | null = null;

  const markDone = (giftId: string) =>
    db
      .update(gifts)
      .set({ pushedToGiverAt: clock.now() })
      .where(and(eq(gifts.id, giftId), isNull(gifts.pushedToGiverAt)))
      .run();

  async function deliver(giftId: string) {
    const due = db
      .select({
        giverId: gifts.giverId,
        receivedAt: gifts.receivedAt,
        lineUserId: giver.lineUserId,
        language: giver.language,
        handle: receiver.handle,
        lineDisplayName: receiver.lineDisplayName,
      })
      .from(gifts)
      .innerJoin(giver, eq(giver.id, gifts.giverId))
      .innerJoin(receiver, eq(receiver.id, gifts.receiverId))
      .where(and(eq(gifts.id, giftId), eq(gifts.status, "received"), isNull(gifts.pushedToGiverAt)))
      .get();
    if (!due?.receivedAt) return;
    const fields = { giftId, userId: due.giverId };
    if (clock.now().getTime() - due.receivedAt.getTime() >= RETRY_WINDOW_MS) {
      markDone(giftId);
      logInfo("gift.giver_notice.given_up", { ...fields, status: "retry_window_passed" });
      return;
    }
    // A deleted account has no LINE user to write to.
    if (due.lineUserId === null) {
      markDone(giftId);
      logInfo("gift.giver_notice.skipped", { ...fields, status: "no_line_user" });
      return;
    }
    const text = receivedText(due.language, receiverName(due, due.language));
    let outcome;
    try {
      outcome = await line.pushText(due.lineUserId, text, receivedRetryKey(giftId));
    } catch (error) {
      // What LINE refused stays refused. Anything else is left to the sweep: LINE may have taken
      // it, and the retry key keeps a retry from sending it twice.
      if (error instanceof LineApiError && !error.retryable) {
        markDone(giftId);
        logFailure("gift.giver_notice.given_up", error, fields);
      } else {
        logFailure("gift.giver_notice.failed", error, fields);
      }
      return;
    }
    markDone(giftId);
    logInfo("gift.giver_notice.sent", { ...fields, status: outcome });
  }

  function send(giftId: string) {
    const inFlight = sending.get(giftId);
    if (inFlight) return inFlight;
    const sent = Promise.resolve()
      .then(() => deliver(giftId))
      .catch((error: unknown) => logFailure("gift.giver_notice.failed", error, { giftId }))
      .finally(() => sending.delete(giftId));
    sending.set(giftId, sent);
    return sent;
  }

  async function sweepDue() {
    const due = db
      .select({ id: gifts.id })
      .from(gifts)
      .where(and(eq(gifts.status, "received"), isNull(gifts.pushedToGiverAt)))
      .orderBy(asc(gifts.receivedAt))
      .all();
    if (due.length === 0) return;
    logInfo("gift.giver_notice.sweep", { count: due.length });
    // One at a time, so a LINE that's failing gets one request after another, not a burst.
    for (const { id } of due) await send(id);
  }

  return {
    send,
    sweep() {
      sweeping ??= sweepDue()
        .catch((error: unknown) => logFailure("gift.giver_notice.sweep_failed", error))
        .finally(() => {
          sweeping = null;
        });
      return sweeping;
    },
    async idle() {
      while (sending.size > 0 || sweeping) await Promise.all([...sending.values(), sweeping]);
    },
  };
}

/** The giver's messages through the Messaging API channel, or off with it. */
export const giverNoticeFor = (
  channel: MessagingChannel,
  { db, clock }: { db: Db; clock: Clock },
): GiverNotice =>
  channel.off === null ? createGiverNotice({ db, clock, line: channel.line }) : giverNoticeOff;

/** Sweeps at once, for what an earlier run left due, then SWEEP_EVERY_MS after each sweep ends. */
export const startGiverNoticeSweeps = (notice: Pick<GiverNotice, "sweep">, schedule?: Schedule) =>
  startRepeatingJob(
    { everyMs: SWEEP_EVERY_MS, failedEvent: "gift.giver_notice.sweep_failed", schedule },
    notice.sweep,
  );
