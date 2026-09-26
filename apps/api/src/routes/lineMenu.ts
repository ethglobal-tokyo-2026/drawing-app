import { Hono } from "hono";
import type { AppDeps } from "../deps.ts";
import { failureCause, logFailure } from "../diagnostics.ts";
import { apiError } from "../errors.ts";
import type { AppEnv } from "../session.ts";

/**
 * Your chat menu under the Official Account's chat in LINE. The app asks once per open, after
 * sign-in, so the menu's Draw key shows the tickets you have left, whatever changed since.
 */
export const lineMenuRoutes = ({ lineChatMenu }: AppDeps) =>
  new Hono<AppEnv>().post("/line-menu", async (c) => {
    const { userId } = c.var;
    let chatMenu;
    try {
      chatMenu = await lineChatMenu.link(userId);
    } catch (error) {
      logFailure("chat_menu.link_failed", error, { userId });
      return apiError(
        c,
        502,
        "line_unavailable",
        `LINE didn't link the chat menu: ${failureCause(error)}`,
      );
    }
    if (!chatMenu) return apiError(c, 401, "signed_out", `Person ${userId} has no account`);
    return c.json({ chatMenu }, 200);
  });
