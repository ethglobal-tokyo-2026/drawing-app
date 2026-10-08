import { readFileSync } from "node:fs";
import { DAILY_TICKETS_PER_DAY, type users } from "@drawing-app/db";
import { z } from "zod";
import type { Tickets } from "../shapes.ts";
import { dailyTicketsPerDay } from "../tickets/tickets.ts";

/**
 * Each language's standard chat menus: the plain one, whose Draw key shows no count, then one for
 * each thing it can show: 3, 2 or 1 daily tickets left, reserve tickets only, or none.
 */
const STANDARD_MENUS = ["plain", "3", "2", "1", "reserve", "none"] as const;
/**
 * Kyoto Seika Manga Expression Practice Mode's count menus, from 1 daily ticket left: index n − 1
 * shows n.
 */
const KYOTO_SEIKA_COUNT_MENUS = [
  "kyoto-seika-1",
  "kyoto-seika-2",
  "kyoto-seika-3",
  "kyoto-seika-4",
  "kyoto-seika-5",
  "kyoto-seika-6",
  "kyoto-seika-7",
  "kyoto-seika-8",
  "kyoto-seika-9",
  "kyoto-seika-10",
] as const;
/**
 * Kyoto Seika Manga Expression Practice Mode's menus. The midnight batch moves people by the menu
 * they're on, so none can share a standard menu's rich menu.
 */
const KYOTO_SEIKA_MENUS = [
  ...KYOTO_SEIKA_COUNT_MENUS,
  "kyoto-seika-reserve",
  "kyoto-seika-none",
] as const;
const CHAT_MENUS = [...STANDARD_MENUS, ...KYOTO_SEIKA_MENUS] as const;
const chatMenuSchema = z.enum(CHAT_MENUS);
export type ChatMenu = z.infer<typeof chatMenuSchema>;

type Language = (typeof users.$inferSelect)["language"];

/** LINE's rich menu IDs: `richmenu-` and 32 lowercase hex digits. Catches a placeholder left in. */
const richMenuIdSchema = z.string().regex(/^richmenu-[0-9a-f]{32}$/, "Expected a rich menu ID");
/** A menu not made yet may be left out, null or "". */
const menuIdSchema = z
  .union([richMenuIdSchema, z.literal(""), z.null()])
  .transform((id) => id || undefined)
  .optional();
const languageMenusSchema = z
  .object({
    plain: menuIdSchema,
    "3": menuIdSchema,
    "2": menuIdSchema,
    "1": menuIdSchema,
    reserve: menuIdSchema,
    none: menuIdSchema,
    "kyoto-seika-10": menuIdSchema,
    "kyoto-seika-9": menuIdSchema,
    "kyoto-seika-8": menuIdSchema,
    "kyoto-seika-7": menuIdSchema,
    "kyoto-seika-6": menuIdSchema,
    "kyoto-seika-5": menuIdSchema,
    "kyoto-seika-4": menuIdSchema,
    "kyoto-seika-3": menuIdSchema,
    "kyoto-seika-2": menuIdSchema,
    "kyoto-seika-1": menuIdSchema,
    "kyoto-seika-reserve": menuIdSchema,
    "kyoto-seika-none": menuIdSchema,
  } satisfies Record<ChatMenu, typeof menuIdSchema>)
  .superRefine((menus, ctx) => {
    for (const kyotoSeikaMenu of KYOTO_SEIKA_MENUS) {
      const shared = STANDARD_MENUS.find(
        (menu) => menus[kyotoSeikaMenu] && menus[menu] === menus[kyotoSeikaMenu],
      );
      if (shared) {
        const message = `shares its rich menu with ${shared}: the midnight batch moves people by the menu they're on`;
        ctx.addIssue({ code: "custom", path: [kyotoSeikaMenu], message });
      }
    }
  });

/**
 * deploy/line/menus.json: each language's chat menus by name, and `default`, the menu LINE shows
 * anyone with no menu of their own. The API links only the languages' menus.
 */
const chatMenuIdsSchema = z.object({
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

/**
 * The menu whose Draw key shows what someone with these tickets has left, among the menus of the
 * mode they're in.
 */
export function chatMenuFor(
  { dailyLeft, reserveLeft }: Pick<Tickets, "dailyLeft" | "reserveLeft">,
  kyotoSeikaPractice: boolean,
): Exclude<ChatMenu, "plain"> {
  if (kyotoSeikaPractice) {
    const counted =
      KYOTO_SEIKA_COUNT_MENUS[Math.min(dailyLeft, KYOTO_SEIKA_COUNT_MENUS.length) - 1];
    if (counted) return counted;
    return reserveLeft > 0 ? "kyoto-seika-reserve" : "kyoto-seika-none";
  }
  if (dailyLeft >= DAILY_TICKETS_PER_DAY) return "3";
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
 * The midnight batch's moves: in each language, everyone on one of a mode's menus moves to its
 * full count, since everyone has a full day's daily tickets again. The plain menu moves with the
 * standard menus: it stands in for a count menu missing from menus.json.
 */
export function midnightMoves(ids: ChatMenuIds) {
  const moves: { from: string; to: string }[] = [];
  const families = [
    [STANDARD_MENUS, false],
    [KYOTO_SEIKA_MENUS, true],
  ] as const;
  for (const menus of [ids.en, ids.ja]) {
    if (!menus) continue;
    for (const [family, kyotoSeikaPractice] of families) {
      const full = chatMenuFor(
        { dailyLeft: dailyTicketsPerDay(kyotoSeikaPractice), reserveLeft: 0 },
        kyotoSeikaPractice,
      );
      const to = menus[full];
      if (!to) continue;
      for (const menu of family) {
        const from = menus[menu];
        if (from && from !== to && !moves.some((move) => move.from === from)) {
          moves.push({ from, to });
        }
      }
    }
  }
  return moves;
}

/** Why nothing was linked: no Messaging API channel, dev sign-in, or no menu for the language. */
const chatMenuOffReasons = ["not_configured", "dev_sign_in", "no_menu"] as const;

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
