import { readFileSync } from "node:fs";
import { createAuthHttpServer } from "./auth-http.js";
import { createLineVerifier } from "./line.js";
import { createLinePrivyJwtIssuer } from "./line-privy-jwt.js";

function requireEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
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
const server = createAuthHttpServer({ issuer, appOrigin: requireEnvironment("APP_ORIGIN") });
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "8787");
server.listen(port, host, () => {
  process.stdout.write(`LINE authentication server listening on ${host}:${port}\n`);
});
