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
      // LINE names the reason ("IdToken expired." and the like); it goes to the server log, never the client.
      const rejection: unknown = await response.json().catch(() => null);
      const reason: unknown =
        rejection && typeof rejection === "object"
          ? Reflect.get(rejection, "error_description")
          : undefined;
      throw new Error(
        `LINE token verification failed with status ${response.status}` +
          (typeof reason === "string" ? `: ${reason}` : ""),
      );
    }
    const claims: unknown = await response.json();
    if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
      throw new Error("Invalid LINE token claims");
    }
    const issuer: unknown = Reflect.get(claims, "iss");
    const audience: unknown = Reflect.get(claims, "aud");
    const subject: unknown = Reflect.get(claims, "sub");
    const expiration: unknown = Reflect.get(claims, "exp");
    if (
      issuer !== "https://access.line.me" ||
      audience !== channelId ||
      typeof subject !== "string" ||
      subject.length === 0 ||
      typeof expiration !== "number" ||
      !Number.isFinite(expiration) ||
      expiration <= Date.now() / 1000
    ) {
      throw new Error("Invalid LINE token claims");
    }
    return { sub: subject };
  };
}
