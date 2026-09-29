import type { Db } from "@drawing-app/db";
import type { Clock, LineChatMenu } from "../deps.ts";
import { createLineMessaging, type LineMessaging } from "../services/lineMessaging.ts";
import { chatMenuOff, createLineChatMenu } from "./lineChatMenu.ts";
import { readChatMenuIds, type ChatMenuIds, type ChatMenuOffReason } from "./menus.ts";

/** The Messaging API channel, or why it's off. */
export type MessagingChannel =
  | { line: LineMessaging; off: null }
  | { line: null; off: Exclude<ChatMenuOffReason, "no_menu"> };

/** The chat menu's service, and what the midnight job needs when it's on. */
export interface ChatMenuSetup {
  lineChatMenu: LineChatMenu;
  on: { line: LineMessaging; ids: ChatMenuIds } | null;
}

/**
 * The Messaging API channel as the server's environment sets it up, which the chat menu and the
 * giver's messages go through: off without the channel's ID and secret, or under dev sign-in, whose
 * made-up LINE user IDs LINE would refuse.
 */
export function messagingChannelFromEnvironment({
  devSignIn,
  channelId,
  channelSecret,
  fetchImpl,
}: {
  devSignIn: string | undefined;
  channelId: string | undefined;
  channelSecret: string | undefined;
  fetchImpl?: typeof fetch;
}): MessagingChannel {
  if (devSignIn === "on") {
    console.warn("The chat menu and the giver's messages are off under DEV_SIGN_IN=on");
    return { line: null, off: "dev_sign_in" };
  }
  if (!channelId || !channelSecret) {
    console.warn(
      "The chat menu and the giver's messages are off: LINE_MESSAGING_CHANNEL_ID and LINE_MESSAGING_CHANNEL_SECRET aren't both set",
    );
    return { line: null, off: "not_configured" };
  }
  return { line: createLineMessaging({ channelId, channelSecret, fetchImpl }), off: null };
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

/** The chat menu, linked through the Messaging API channel, or off with it. */
export function chatMenuFromEnvironment({
  db,
  clock,
  channel,
  menusFile,
}: {
  db: Db;
  clock: Clock;
  channel: MessagingChannel;
  menusFile: string | undefined;
}): ChatMenuSetup {
  if (channel.off !== null) return { lineChatMenu: chatMenuOff(channel.off), on: null };
  const { line } = channel;
  const ids = chatMenuIdsFrom(menusFile);
  return { lineChatMenu: createLineChatMenu({ db, clock, line, ids }), on: { line, ids } };
}
