import { users, type Db } from "@drawing-app/db";
import { MAX_ACCESS_TOKEN_LENGTH } from "@drawing-app/line-auth/line";
import { and, eq, isNull } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { z } from "zod";
import {
  LineTokenInvalidError,
  LineUnavailableError,
  type AppDeps,
  type LineVerifier,
} from "../deps.ts";
import { failureCause, logFailure } from "../diagnostics.ts";
import { apiError, validate } from "../errors.ts";
import { unseenGratitudeCount } from "../gratitude/feed.ts";
import { HANDLE_MAX_LENGTH } from "../session/handleLimit.ts";
import { isHandleTaken, parseHandle } from "../session/handles.ts";
import { clearSessionCookie, setSessionCookie, type AppEnv } from "../session.ts";
import { toMe } from "../shapes.ts";
import { newStickerCount } from "../stickerBoards/board.ts";

/** The x-line-user-id header's longest accepted length, far over LINE's own user IDs. */
export const LINE_USER_ID_MAX_LENGTH = 128;

/** The users columns a request sets, with the checks the table can't make. */
const userInput = createInsertSchema(users, {
  // Only a string here: a handle that breaks the rules answers handle_invalid, not invalid_request.
  handle: z.string(),
});

// `language` is LINE's, or the device's own outside LINE: a new account starts in it.
const signInBody = userInput
  .pick({ language: true })
  .required()
  .extend({ accessToken: z.string().min(1).max(MAX_ACCESS_TOKEN_LENGTH) });

const meHeaders = z.object({
  "x-line-user-id": z.string().min(1).max(LINE_USER_ID_MAX_LENGTH).optional(),
});

const handleBody = userInput.pick({ handle: true });

/** The language picked in Settings, English or Japanese. */
const languageChoiceBody = userInput.pick({ language: true }).required();

/** Show 18+ stickers, in Settings: on or off. */
const nsfwOptInBody = z.object({ nsfwOptIn: z.boolean() });

/** Kyoto Seika Manga Expression Practice Mode, in Settings: on or off. */
const kyotoSeikaPracticeBody = z.object({ kyotoSeikaPractice: z.boolean() });

type UserRow = typeof users.$inferSelect;

/** A live account's row; undefined once it's deleted. */
const liveUser = (db: Db, userId: string) =>
  db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .get();

/** You, with the NEW and pink-tag counts. */
const meOf = (db: Db, user: UserRow) =>
  toMe(user, {
    newStickerCount: newStickerCount(db, user.id),
    unseenGratitudeCount: unseenGratitudeCount(db, user.id),
  });

/**
 * Who LINE says the access token names, its refusal, or that LINE couldn't be asked. LINE's reason for a
 * refusal goes to the log only.
 */
async function lineProfileOf(line: LineVerifier, accessToken: string) {
  try {
    return await line.verifyAccessToken(accessToken);
  } catch (error) {
    if (error instanceof LineTokenInvalidError) {
      logFailure("line.token.refused", error);
      return error;
    }
    if (error instanceof LineUnavailableError) {
      logFailure("line.token.unverified", error);
      return error;
    }
    throw error;
  }
}

/** Session and you: signing in with LINE, your profile, handle and language, and account deletion. */
export const sessionRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    .post("/session", validate("json", signInBody), async (c) => {
      const { accessToken, language } = c.req.valid("json");
      const profile = await lineProfileOf(deps.line, accessToken);
      if (profile instanceof LineUnavailableError) {
        return apiError(c, 502, "line_unavailable", `LINE didn't answer: ${failureCause(profile)}`);
      }
      if (profile instanceof LineTokenInvalidError) {
        return profile.reason === "expired"
          ? apiError(c, 401, "line_token_expired", "LINE access token expired")
          : apiError(c, 401, "line_token_invalid", "LINE refused the access token");
      }
      const lineProfile = {
        lineDisplayName: profile.name,
        linePictureUrl: profile.picture ?? null,
      };
      const user = deps.db.transaction(
        (tx) => {
          // A deleted account has no line_user_id, so signing in again makes a new person. Only a new
          // person takes the sign-in's language: a returning one keeps theirs, whatever LINE's is now.
          const returning = tx
            .update(users)
            .set(lineProfile)
            .where(eq(users.lineUserId, profile.sub))
            .returning()
            .get();
          if (returning) return returning;
          const handle = parseHandle(profile.name);
          const created = tx
            .insert(users)
            .values({
              id: deps.ids.uuid(),
              lineUserId: profile.sub,
              ...lineProfile,
              language,
              handle: handle !== null && !isHandleTaken(tx, handle) ? handle : null,
            })
            .returning()
            .get();
          return created;
        },
        { behavior: "immediate" },
      );
      await setSessionCookie(c, deps.sessionSecret, user.id);
      return c.json({ me: meOf(deps.db, user) }, 200);
    })
    // Logging out of LINE ends the session too, so a browser handed to someone else holds none.
    .delete("/session", (c) => {
      clearSessionCookie(c);
      return c.body(null, 204);
    })
    .get("/me", validate("header", meHeaders), (c) => {
      c.header("Cache-Control", "no-store");
      const user = liveUser(deps.db, c.var.userId);
      if (!user) return apiError(c, 401, "signed_out");
      // The signed cookie authenticates; LIFF's account only restricts which session can be reused.
      const lineUserId = c.req.valid("header")["x-line-user-id"];
      if (lineUserId !== undefined && user.lineUserId !== lineUserId) {
        return apiError(c, 401, "signed_out");
      }
      return c.json({ me: meOf(deps.db, user) }, 200);
    })
    .post("/me/handle", validate("json", handleBody), (c) => {
      const handle = parseHandle(c.req.valid("json").handle);
      if (handle === null) {
        return apiError(
          c,
          400,
          "handle_invalid",
          `handle: 1 to ${HANDLE_MAX_LENGTH} characters after trimming, with no @`,
        );
      }
      const { userId } = c.var;
      const user = deps.db.transaction(
        (tx) => {
          if (isHandleTaken(tx, handle, userId)) return null;
          const updated = tx
            .update(users)
            .set({ handle })
            .where(and(eq(users.id, userId), isNull(users.deletedAt)))
            .returning()
            .get();
          return updated;
        },
        { behavior: "immediate" },
      );
      if (user === null) return apiError(c, 409, "handle_taken", `Someone else has @${handle}`);
      if (!user) return apiError(c, 401, "signed_out");
      return c.json({ me: meOf(deps.db, user) }, 200);
    })
    .post("/me/language-choice", validate("json", languageChoiceBody), (c) => {
      const { language } = c.req.valid("json");
      // The person's language outside the app too, such as their chat menu's, from now on.
      const user = deps.db
        .update(users)
        .set({ language })
        .where(and(eq(users.id, c.var.userId), isNull(users.deletedAt)))
        .returning()
        .get();
      if (!user) return apiError(c, 401, "signed_out");
      void deps.lineChatMenu.relink(user.id);
      return c.json({ me: meOf(deps.db, user) }, 200);
    })
    .post("/me/nsfw-opt-in", validate("json", nsfwOptInBody), (c) => {
      const { nsfwOptIn } = c.req.valid("json");
      const user = deps.db
        .update(users)
        .set({ nsfwOptedInAt: nsfwOptIn ? deps.clock.now() : null })
        .where(and(eq(users.id, c.var.userId), isNull(users.deletedAt)))
        .returning()
        .get();
      if (!user) return apiError(c, 401, "signed_out");
      return c.json({ me: meOf(deps.db, user) }, 200);
    })
    .post("/me/kyoto-seika-practice", validate("json", kyotoSeikaPracticeBody), (c) => {
      const { kyotoSeikaPractice } = c.req.valid("json");
      const user = deps.db
        .update(users)
        .set({ kyotoSeikaPracticeOnAt: kyotoSeikaPractice ? deps.clock.now() : null })
        .where(and(eq(users.id, c.var.userId), isNull(users.deletedAt)))
        .returning()
        .get();
      if (!user) return apiError(c, 401, "signed_out");
      // The Draw key's menus change with the mode at once, as its count does after a spend.
      void deps.lineChatMenu.relink(user.id);
      return c.json({ me: meOf(deps.db, user) }, 200);
    })
    .delete("/me", (c) => {
      // Read before the row loses it: their chat menu goes back to LINE's default, in the background.
      const lineUserId = liveUser(deps.db, c.var.userId)?.lineUserId;
      // The handle goes with the LINE columns, since it started as the LINE name. The row stays, as
      // the Original Artist of their stickers, with their smart wallet and gifts.
      deps.db
        .update(users)
        .set({
          deletedAt: deps.clock.now(),
          lineUserId: null,
          lineDisplayName: null,
          linePictureUrl: null,
          handle: null,
          nsfwOptedInAt: null,
          kyotoSeikaPracticeOnAt: null,
        })
        .where(and(eq(users.id, c.var.userId), isNull(users.deletedAt)))
        .run();
      if (lineUserId) void deps.lineChatMenu.unlink(c.var.userId, lineUserId);
      clearSessionCookie(c);
      return c.body(null, 204);
    });
