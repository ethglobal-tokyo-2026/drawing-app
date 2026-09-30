import { users, type Db } from "@drawing-app/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Clock, LineChatMenu } from "../deps.ts";
import { logFailure, logInfo } from "../diagnostics.ts";
import type { LineMessaging } from "../services/lineMessaging.ts";
import { ticketsLeftOf } from "../tickets/tickets.ts";
import { chatMenuFor, menuToLink, type ChatMenuIds, type ChatMenuOffReason } from "./menus.ts";

/** The chat menu with nothing to link with: every call does nothing, and `link` says why. */
export const chatMenuOff = (reason: Exclude<ChatMenuOffReason, "no_menu">): LineChatMenu => ({
  link: () => Promise.resolve({ status: "off", reason }),
  relink: () => Promise.resolve(),
  unlink: () => Promise.resolve(),
  idle: () => Promise.resolve(),
});

/**
 * Links each person's chat menu through the Messaging API channel, to the menu in `ids` for their
 * language and what their Draw key shows now.
 */
export function createLineChatMenu({
  db,
  clock,
  line,
  ids,
}: {
  db: Db;
  clock: Clock;
  line: LineMessaging;
  ids: ChatMenuIds;
}): LineChatMenu {
  // Each person's calls run in turn, so a link that read an older count can't land after a newer one.
  const turns = new Map<string, Promise<void>>();

  function inTurn<T>(userId: string, call: () => Promise<T>): Promise<T> {
    const result = (turns.get(userId) ?? Promise.resolve()).then(call);
    const turn = result.then(
      () => undefined,
      () => undefined,
    );
    turns.set(userId, turn);
    void turn.then(() => {
      if (turns.get(userId) === turn) turns.delete(userId);
    });
    return result;
  }

  /** The person's LINE user ID and the menu their tickets call for now; null once the account is gone. */
  function menuNow(userId: string) {
    const user = db
      .select({ lineUserId: users.lineUserId, language: users.language })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .get();
    if (!user?.lineUserId) return null;
    const wanted = chatMenuFor(ticketsLeftOf(db, userId, clock.now()));
    return { lineUserId: user.lineUserId, toLink: menuToLink(ids, user.language, wanted) };
  }

  return {
    link: (userId) =>
      inTurn(userId, async () => {
        const now = menuNow(userId);
        if (!now) return null;
        const { lineUserId, toLink } = now;
        if (!toLink) return { status: "off", reason: "no_menu" } as const;
        await line.linkMenu(lineUserId, toLink.richMenuId);
        // LINE also answers 200 when it links nothing: the person hasn't added the account, or blocked it.
        const shown = await line.linkedMenu(lineUserId);
        const status = shown === toLink.richMenuId ? "linked" : "not_a_friend";
        logInfo("chat_menu.linked", { userId, status, menu: toLink.menu });
        return { status, menu: toLink.menu };
      }),

    relink: (userId) =>
      inTurn(userId, async () => {
        const now = menuNow(userId);
        if (!now?.toLink) return;
        await line.linkMenu(now.lineUserId, now.toLink.richMenuId);
        logInfo("chat_menu.relinked", { userId, menu: now.toLink.menu });
      }).catch((error: unknown) => logFailure("chat_menu.relink_failed", error, { userId })),

    unlink: (userId, lineUserId) =>
      inTurn(userId, async () => {
        await line.unlinkMenu(lineUserId);
        logInfo("chat_menu.unlinked", { userId });
      }).catch((error: unknown) => logFailure("chat_menu.unlink_failed", error, { userId })),

    async idle() {
      while (turns.size > 0) await Promise.all(turns.values());
    },
  };
}
