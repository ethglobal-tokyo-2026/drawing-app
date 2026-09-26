import { ApiError, apiError } from "./apiClient";

const field = (value: unknown, key: string): unknown =>
  value && typeof value === "object" ? Reflect.get(value, key) : undefined;

/** A JSON API request whose failures keep the server's stable error code. */
export async function requestJson(
  path: string,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...init,
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw apiError(error);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = field(body, "error");
    const detail = field(body, "detail");
    throw new ApiError(response.status, {
      error: typeof code === "string" ? code : `http_${response.status}`,
      ...(typeof detail === "string" && { detail }),
    });
  }
  return body;
}

export const postJson = (path: string, body?: unknown) =>
  requestJson(path, {
    method: "POST",
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function requiredObject(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} is not an object`);
  }
  return value;
}

export function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) throw new Error(`${label} is missing`);
  return value;
}

export function requiredNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} is missing`);
  return value;
}
