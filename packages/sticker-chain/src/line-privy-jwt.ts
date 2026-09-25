import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  type JsonWebKey,
} from "node:crypto";

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

interface LinePrivyJwtIssuerOptions {
  verifyLineIdToken: (idToken: string) => Promise<{ sub: string }>;
  channelId: string;
  issuer: string;
  audience: string;
  privateKeyPem: string;
  keyId: string;
  now?: () => number;
}

export interface LinePrivyJwtIssuer {
  issue: (lineIdToken: string) => Promise<{
    jwt: string;
    subject: string;
    expiresAt: number;
  }>;
  jwks: { keys: JsonWebKey[] };
}

export function createLinePrivyJwtIssuer({
  verifyLineIdToken,
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

  async function issue(lineIdToken: string) {
    const { sub } = await verifyLineIdToken(lineIdToken);
    if (!sub) throw new Error("LINE verification returned no user");
    const subject = `line_${createHash("sha256")
      .update(channelId)
      .update("\0")
      .update(sub)
      .digest("base64url")}`;
    const issuedAt = now();
    const header = { alg: "ES256", typ: "JWT", kid: keyId };
    const payload = {
      iss: issuer,
      aud: audience,
      sub: subject,
      iat: issuedAt,
      exp: issuedAt + 300,
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
