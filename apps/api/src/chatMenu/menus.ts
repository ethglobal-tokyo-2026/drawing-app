import { readFileSync } from "node:fs";
import type { users } from "@drawing-app/db";
import { z } from "zod";
import type { Tickets } from "../shapes.ts";

/**
 * Each language's chat menus: the plain one, whose Draw key shows no count, and one for each thing
 * the Draw key can show: 3, 2 or 1 daily tickets left, reserve tickets only, or none.
 */
export const CHAT_MENUS = ["plain", "3", "2", "1", "reserve", "none"] as const;
export const chatMenuSchema = z.enum(CHAT_MENUS);
export type ChatMenu = z.infer<typeof chatMenuSchema>;

type Language = (typeof users.$inferSelect)["language"];

/** LINE's rich menu IDs are `richmenu-` and 32 hex digits; this catches a placeholder left in. */
const richMenuIdSchema = z.string().regex(/^richmenu-[0-9A-Za-z-]+$/, "Expected a rich menu ID");
/** A menu not made yet may be left out, null or "". */
const menuIdSchema = z
  .union([richMenuIdSchema, z.literal(""), z.null()])
  .transform((id) => id || undefined)
  .optional();
const languageMenusSchema = z.object({
  plain: menuIdSchema,
  "3": menuIdSchema,
  "2": menuIdSchema,
  "1": menuIdSchema,
  reserve: menuIdSchema,
  none: menuIdSchema,
} satisfies Record<ChatMenu, typeof menuIdSchema>);

/**
 * deploy/line/menus.json: each language's chat menus by name, and `default`, the menu LINE shows
 * anyone with no menu of their own. The API links only the languages' menus.
 */
export const chatMenuIdsSchema = z.object({
  en: languageMenusSchema.optional(),
  ja: languageMenusSchema.optional(),
  default: menuIdSchema,
});
export type ChatMenuIds = z.infer<typeof chatMenuIdsSchema>;

/** Reads deploy/line/menus.json. Throws, naming the problem, when it's missing or malformed. */
export function readChatMenuIds(path: string): ChatMenuIds {
  const parsed = chatMenuIdsSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) {
    throw new Error(`${path} isn't a chat menu map:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

/** The menu whose Draw key shows what someone with these tickets has left. */
export function chatMenuFor({
  dailyLeft,
  reserveLeft,
}: Pick<Tickets, "dailyLeft" | "reserveLeft">): Exclude<ChatMenu, "plain"> {
  if (dailyLeft >= 3) return "3";
  if (dailyLeft === 2) return "2";
  if (dailyLeft === 1) return "1";
  return reserveLeft > 0 ? "reserve" : "none";
}

/** The menu to link for `wanted` in `language`: that one, or else the plain one; null with neither. */
export function menuToLink(ids: ChatMenuIds, language: Language, wanted: ChatMenu) {
  const menus = ids[language];
  const richMenuId = menus?.[wanted];
  if (richMenuId) return { menu: wanted, richMenuId };
  return menus?.plain ? { menu: "plain" as const, richMenuId: menus.plain } : null;
}

/**
 * The midnight batch's moves: in each language with a 3 menu, everyone on another of its menus
 * moves to it, since everyone has 3 daily tickets again. The plain menu moves too, so a menu linked
 * before the counts existed turns into one.
 */
export function midnightMoves(ids: ChatMenuIds) {
  const moves: { from: string; to: string }[] = [];
  for (const menus of [ids.en, ids.ja]) {
    const to = menus?.["3"];
    if (!menus || !to) continue;
    for (const menu of CHAT_MENUS) {
      const from = menus[menu];
      if (from && from !== to && !moves.some((move) => move.from === from)) {
        moves.push({ from, to });
      }
    }
  }
  return moves;
}

/** Why nothing was linked: no Messaging API channel, dev sign-in, or no menu for the language. */
export const chatMenuOffReasons = ["not_configured", "dev_sign_in", "no_menu"] as const;

/** POST /api/line-menu's answer: the chat menu LINE shows you now. */
export const chatMenuLinkSchema = z.discriminatedUnion("status", [
  /** Linked, and LINE shows it. */
  z.object({ status: z.literal("linked"), menu: chatMenuSchema }),
  /**
   * LINE took the link but shows the default menu: you haven't added the Official Account as a
   * friend, or you've blocked it.
   */
  z.object({ status: z.literal("not_a_friend"), menu: chatMenuSchema }),
  /** Nothing was linked. */
  z.object({ status: z.literal("off"), reason: z.enum(chatMenuOffReasons) }),
]);
export type ChatMenuLink = z.infer<typeof chatMenuLinkSchema>;
export type ChatMenuOffReason = (typeof chatMenuOffReasons)[number];
