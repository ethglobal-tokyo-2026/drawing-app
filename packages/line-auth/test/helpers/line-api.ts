export const CHANNEL_ID = "line-channel-123";
export const LINE_PROFILE = {
  userId: "private-line-user-id",
  displayName: "Alice",
  pictureUrl: "https://profile.line-scdn.net/a",
};

/** LINE's verify answer for a live access token issued for `channelId`. */
export const verifiedFor = (channelId = CHANNEL_ID) =>
  Response.json({ scope: "profile openid", client_id: channelId, expires_in: 3600 });

/**
 * LINE's API as the verifier asks it: `verify` answers the verify endpoint and `profile` the profile
 * endpoint, by default as for a live token of this channel's. Each request goes to `asked` too.
 */
export function lineAnswering({
  verify = () => verifiedFor(),
  profile = () => Response.json(LINE_PROFILE),
  asked = [],
}: {
  verify?: () => Response | Promise<Response>;
  profile?: () => Response | Promise<Response>;
  asked?: { url: string; headers: Headers }[];
} = {}): typeof fetch {
  return async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    asked.push({ url, headers: new Headers(init?.headers) });
    return new URL(url).pathname === "/v2/profile" ? profile() : verify();
  };
}
