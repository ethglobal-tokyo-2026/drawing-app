import { readFileSync } from "node:fs";
import { createAuthHttpServer } from "./auth-http.js";
import { createLineMenuSwitch } from "./line-menu.js";
import { createLineVerifier } from "./line.js";
import { createLinePrivyJwtIssuer } from "./line-privy-jwt.js";

function requireEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

// Chat menu switching is optional: without it the server still signs people in, and its route answers 503.
function createLineMenuSwitchFromEnvironment(loginChannelId: string, privyAppId: string) {
  const {
    PRIVY_APP_SECRET,
    LINE_MESSAGING_CHANNEL_ID,
    LINE_MESSAGING_CHANNEL_SECRET,
    LINE_RETURNING_RICH_MENU_ID,
  } = process.env;
  if (
    PRIVY_APP_SECRET &&
    LINE_MESSAGING_CHANNEL_ID &&
    LINE_MESSAGING_CHANNEL_SECRET &&
    LINE_RETURNING_RICH_MENU_ID
  ) {
    const switchLineMenu = createLineMenuSwitch({
      loginChannelId,
      privyAppId,
      privyAppSecret: PRIVY_APP_SECRET,
      messagingChannelId: LINE_MESSAGING_CHANNEL_ID,
      messagingChannelSecret: LINE_MESSAGING_CHANNEL_SECRET,
      returningRichMenuId: LINE_RETURNING_RICH_MENU_ID,
    });
    process.stdout.write("LINE chat menu switching is on\n");
    return switchLineMenu;
  }
  const missing = Object.entries({
    PRIVY_APP_SECRET,
    LINE_MESSAGING_CHANNEL_ID,
    LINE_MESSAGING_CHANNEL_SECRET,
    LINE_RETURNING_RICH_MENU_ID,
  })
    .filter(([, value]) => !value)
    .map(([name]) => name);
  process.stdout.write(`LINE chat menu switching is off; not set: ${missing.join(", ")}\n`);
  return undefined;
}

const channelId = requireEnvironment("LINE_CHANNEL_ID");
const privyAppId = requireEnvironment("PRIVY_APP_ID");
const issuer = createLinePrivyJwtIssuer({
  verifyLineIdToken: createLineVerifier({ channelId }),
  channelId,
  issuer: requireEnvironment("AUTH_ISSUER"),
  audience: privyAppId,
  privateKeyPem: readFileSync(requireEnvironment("AUTH_SIGNING_KEY_FILE"), "utf8"),
  keyId: requireEnvironment("AUTH_KEY_ID"),
});
const server = createAuthHttpServer({
  issuer,
  switchLineMenu: createLineMenuSwitchFromEnvironment(channelId, privyAppId),
  appOrigin: requireEnvironment("APP_ORIGIN"),
});
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "8787");
server.listen(port, host, () => {
  process.stdout.write(`LINE authentication server listening on ${host}:${port}\n`);
});
