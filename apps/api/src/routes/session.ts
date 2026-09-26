import { users, type Db } from "@drawing-app/db";
import { and, eq, isNull } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { z } from "zod";
import { LineTokenInvalidError, type AppDeps, type LineVerifier } from "../deps.ts";
import { apiError, validate } from "../errors.ts";
import { HANDLE_MAX_LENGTH, isHandleTaken, parseHandle } from "../session/handles.ts";
import { clearSessionCookie, setSessionCookie, type AppEnv } from "../session.ts";
import { toMe } from "../shapes.ts";
import { newStickerCount, unseenGratitudeCount } from "../views.ts";

/** A LIFF ID token's longest accepted length. */
export const ID_TOKEN_MAX_LENGTH = 6000;

const isTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    // Intl throws a RangeError for a zone it doesn't know, which is the answer.
    return false;
  }
};

/** The users columns a request sets, with the checks the table can't make. */
const userInput = createInsertSchema(users, {
  timeZone: (schema) => schema.refine(isTimeZone, "must be an IANA time zone"),
  // Only a string here: a handle that breaks the rules answers handle_invalid, not invalid_request.
  handle: z.string(),
});

const signInBody = userInput
  .pick({ timeZone: true })
  .required()
  .extend({ idToken: z.string().min(1).max(ID_TOKEN_MAX_LENGTH) });

const handleBody = userInput.pick({ handle: true });

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

/** Who LINE says the ID token names, or null when LINE refuses it. LINE's reason goes to the log only. */
async function lineProfileOf(line: LineVerifier, idToken: string) {
  try {
    return await line.verifyIdToken(idToken);
  } catch (error) {
    if (!(error instanceof LineTokenInvalidError)) throw error;
    console.warn(`LINE refused an ID token: ${error.message}`);
    return null;
  }
}

/** Session and you: signing in with LINE, your profile and handle, and account deletion. */
export const sessionRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    .post("/session", validate("json", signInBody), async (c) => {
      const { idToken, timeZone } = c.req.valid("json");
      const profile = await lineProfileOf(deps.line, idToken);
      if (!profile) return apiError(c, 401, "line_token_invalid", "LINE refused the ID token");
      const lineProfile = {
        lineDisplayName: profile.name,
        linePictureUrl: profile.picture ?? null,
      };
      const user = deps.db.transaction(
        (tx) => {
          // A deleted account has no line_user_id, so signing in again makes a new person.
          const returning = tx
            .update(users)
            .set(lineProfile)
            .where(eq(users.lineUserId, profile.sub))
            .returning()
            .get();
          if (returning) return returning;
          const handle = parseHandle(profile.name);
          return tx
            .insert(users)
            .values({
              id: deps.ids.uuid(),
              lineUserId: profile.sub,
              ...lineProfile,
              timeZone,
              handle: handle !== null && !isHandleTaken(tx, handle) ? handle : null,
            })
            .returning()
            .get();
        },
        { behavior: "immediate" },
      );
      await setSessionCookie(c, deps.sessionSecret, user.id);
      return c.json({ me: meOf(deps.db, user) }, 200);
    })
    .get("/me", (c) => {
      const user = liveUser(deps.db, c.var.userId);
      if (!user) return apiError(c, 401, "signed_out");
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
        (tx) =>
          isHandleTaken(tx, handle, userId)
            ? null
            : tx
                .update(users)
                .set({ handle })
                .where(and(eq(users.id, userId), isNull(users.deletedAt)))
                .returning()
                .get(),
        { behavior: "immediate" },
      );
      if (user === null) return apiError(c, 409, "handle_taken", `Someone else has @${handle}`);
      if (!user) return apiError(c, 401, "signed_out");
      return c.json({ me: meOf(deps.db, user) }, 200);
    })
    .delete("/me", (c) => {
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
        })
        .where(and(eq(users.id, c.var.userId), isNull(users.deletedAt)))
        .run();
      clearSessionCookie(c);
      return c.body(null, 204);
    });
