import type { Db } from "@drawing-app/db";
import type { Clock, LineChatMenu } from "../deps.ts";
import { createLineMessaging, type LineMessaging } from "../services/lineMessaging.ts";
import { chatMenuOff, createLineChatMenu } from "./lineChatMenu.ts";
import { readChatMenuIds, type ChatMenuIds } from "./menus.ts";

/** The chat menu's service, and what the midnight job needs when it's on. */
export interface ChatMenuSetup {
  lineChatMenu: LineChatMenu;
  on: { line: LineMessaging; ids: ChatMenuIds } | null;
}

/** deploy/line/menus.json, or no menus when it's missing or malformed: every link then does nothing. */
function chatMenuIdsFrom(menusFile: string | undefined): ChatMenuIds {
  if (!menusFile) {
    console.warn("LINE_CHAT_MENUS_FILE isn't set, so there's no chat menu to link");
    return {};
  }
  try {
    return readChatMenuIds(menusFile);
  } catch (error) {
    console.error("The chat menu map can't be read, so there's no chat menu to link", error);
    return {};
  }
}

/**
 * The chat menu as the server's environment sets it up: linked through the Messaging API channel,
 * or off without the channel's ID and secret, or under dev sign-in, whose made-up LINE user IDs
 * LINE would refuse.
 */
export function chatMenuFromEnvironment({
  db,
  clock,
  devSignIn,
  channelId,
  channelSecret,
  menusFile,
}: {
  db: Db;
  clock: Clock;
  devSignIn: string | undefined;
  channelId: string | undefined;
  channelSecret: string | undefined;
  menusFile: string | undefined;
}): ChatMenuSetup {
  if (devSignIn === "on") {
    console.warn("The chat menu is off under DEV_SIGN_IN=on");
    return { lineChatMenu: chatMenuOff("dev_sign_in"), on: null };
  }
  if (!channelId || !channelSecret) {
    console.warn(
      "The chat menu is off: LINE_MESSAGING_CHANNEL_ID and LINE_MESSAGING_CHANNEL_SECRET aren't both set",
    );
    return { lineChatMenu: chatMenuOff("not_configured"), on: null };
  }
  const ids = chatMenuIdsFrom(menusFile);
  const line = createLineMessaging({ channelId, channelSecret });
  return { lineChatMenu: createLineChatMenu({ db, clock, line, ids }), on: { line, ids } };
}
