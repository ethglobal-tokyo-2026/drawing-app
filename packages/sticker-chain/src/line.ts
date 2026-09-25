const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export function createLineVerifier({
  channelId,
  fetchImpl = fetch,
}: {
  channelId: string;
  fetchImpl?: typeof fetch;
}) {
  if (!channelId) throw new Error("LINE_CHANNEL_ID is required");

  return async function verifyLineIdToken(idToken: string) {
    if (typeof idToken !== "string" || idToken.length < 10 || idToken.length > 6000) {
      throw new Error("Invalid LINE token");
    }
    const response = await fetchImpl(LINE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`LINE token verification failed with status ${response.status}`);
    }
    const claims: unknown = await response.json();
    if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
      throw new Error("Invalid LINE token claims");
    }
    const issuer = Reflect.get(claims, "iss");
    const audience = Reflect.get(claims, "aud");
    const subject = Reflect.get(claims, "sub");
    const expiration = Reflect.get(claims, "exp");
    if (
      issuer !== "https://access.line.me" || audience !== channelId ||
      typeof subject !== "string" || subject.length === 0 ||
      typeof expiration !== "number" || !Number.isFinite(expiration) ||
      expiration <= Date.now() / 1000
    ) {
      throw new Error("Invalid LINE token claims");
    }
    return { sub: subject };
  };
}
