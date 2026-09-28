const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Only route templates reach the console; gift links and URL parameters can contain secrets. */
function nftRequestPath(url: string, method: string): string | undefined {
  if (method !== "POST") return;
  let path: string;
  try {
    path = new URL(url, "https://drawing.invalid").pathname;
  } catch {
    // Fetch still reports invalid URLs; diagnostics must not prevent the request.
    return;
  }
  if (path === "/api/stickers" || path === "/api/gifts") return path;
  if (path === "/api/gifts/preview" || path === "/api/gifts/receive") return path;
  const action = /^\/api\/gifts\/[^/]+\/(deposit|shared|take-out|receive)$/.exec(path)?.[1];
  return action ? `/api/gifts/:giftId/${action}` : undefined;
}

/** The response body and raw errors stay with the caller, outside these diagnostic records. */
export function startNftRequest(url: string, method: string) {
  const path = nftRequestPath(url, method);
  if (!path) return;
  const startedAt = performance.now();
  const request = { method, path };
  console.info("NFT API request", { event: "nft_request_started", ...request, elapsedMs: 0 });
  const elapsedMs = () => Math.round(performance.now() - startedAt);
  return {
    completed: (response: Response) => {
      const requestId = response.headers.get("x-request-id");
      const record = {
        event: response.ok ? "nft_request_completed" : "nft_request_http_failed",
        ...request,
        elapsedMs: elapsedMs(),
        status: response.status,
        ...(requestId && REQUEST_ID.test(requestId) ? { requestId } : {}),
      };
      if (response.ok) console.info("NFT API request", record);
      else console.error("NFT API request", record);
    },
    networkFailed: () => {
      console.error("NFT API request", {
        event: "nft_request_network_failed",
        ...request,
        elapsedMs: elapsedMs(),
        status: 0,
      });
    },
  };
}
