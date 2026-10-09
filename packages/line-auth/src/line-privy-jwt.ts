import { createHash, createPrivateKey, createPublicKey, sign, type JsonWebKey } from "node:crypto";

/** How long an issued Privy JWT stays valid. */
export const PRIVY_JWT_LIFETIME_S = 300;

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** A LINE user's Privy user ID: scoped to the Login Channel, and never the raw LINE user ID. */
export function privySubject(channelId: string, lineUserId: string): string {
  const digest = createHash("sha256").update(channelId).update("\0").update(lineUserId);
  return `line_${digest.digest("base64url")}`;
}

interface LinePrivyJwtIssuerOptions {
  verifyLineAccessToken: (accessToken: string) => Promise<{ sub: string }>;
  channelId: string;
  issuer: string;
  audience: string;
  privateKeyPem: string;
  keyId: string;
  now?: () => number;
}

export interface LinePrivyJwtIssuer {
  issue: (lineAccessToken: string) => Promise<{
    jwt: string;
    subject: string;
    expiresAt: number;
  }>;
  jwks: { keys: JsonWebKey[] };
}

export function createLinePrivyJwtIssuer({
  verifyLineAccessToken,
  channelId,
  issuer,
  audience,
  privateKeyPem,
  keyId,
  now = () => Math.floor(Date.now() / 1000),
}: LinePrivyJwtIssuerOptions): LinePrivyJwtIssuer {
  if (!channelId || !issuer || !audience || !privateKeyPem || !keyId) {
    throw new Error("LINE and Privy JWT configuration is incomplete");
  }
  const privateKey = createPrivateKey(privateKeyPem);
  if (
    privateKey.asymmetricKeyType !== "ec" ||
    privateKey.asymmetricKeyDetails?.namedCurve !== "prime256v1"
  ) {
    throw new Error("Privy JWT signing key must be a P-256 EC private key");
  }
  const publicJwk = createPublicKey(privateKey).export({ format: "jwk" });
  const jwks = {
    keys: [{ ...publicJwk, kid: keyId, alg: "ES256", use: "sig" }],
  };

  async function issue(lineAccessToken: string) {
    const { sub } = await verifyLineAccessToken(lineAccessToken);
    if (!sub) throw new Error("LINE verification returned no user");
    const subject = privySubject(channelId, sub);
    const issuedAt = now();
    const header = { alg: "ES256", typ: "JWT", kid: keyId };
    const payload = {
      iss: issuer,
      aud: audience,
      sub: subject,
      iat: issuedAt,
      exp: issuedAt + PRIVY_JWT_LIFETIME_S,
    };
    const signingInput = `${encode(header)}.${encode(payload)}`;
    const signature = sign("sha256", Buffer.from(signingInput), {
      key: privateKey,
      dsaEncoding: "ieee-p1363",
    }).toString("base64url");
    return {
      jwt: `${signingInput}.${signature}`,
      subject,
      expiresAt: payload.exp,
    };
  }

  return { issue, jwks };
}
