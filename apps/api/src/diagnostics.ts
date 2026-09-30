import { AsyncLocalStorage } from "node:async_hooks";

interface RequestContext {
  requestId: string;
  method: string;
  route: string;
}

export interface DiagnosticFields {
  stickerId?: string;
  giftId?: string;
  userId?: string;
  artistId?: string;
  recipientId?: string;
  chainId?: number;
  contractAddress?: string;
  address?: string;
  txHash?: string;
  tokenId?: string;
  blockNumber?: string;
  status?: string | number;
  elapsedMs?: number;
  cached?: boolean;
  recovered?: boolean;
  mode?: string;
  stage?: string;
  errorCode?: string;
  ticketDay?: string;
  count?: number;
  menu?: string;
  /**
   * The expiry sweep's tally: gifts it sent back, recorded as the escrow left them, closed with no
   * deposit, left alone, or failed on.
   */
  returned?: number;
  recorded?: number;
  closed?: number;
  left?: number;
  failed?: number;
}

const requests = new AsyncLocalStorage<RequestContext>();

export const withRequestDiagnostics = <T>(context: RequestContext, action: () => T): T =>
  requests.run(context, action);

/** Provider errors can include credentials and entire signed requests in their prose. */
function redact(message: string): string {
  return message
    .replace(/(?:https?|wss?):\/\/[^\s<>"']+/gi, "[redacted-url]")
    .replace(/\b(?:authorization|set-cookie|cookie)\s*[:=][^\r\n]*/gi, "[redacted-header]")
    .replace(/\b(?:Bearer|Basic)\s+[a-z0-9+/=_\-.]+/gi, "[redacted-authorization]")
    .replace(
      /(["']?(?:api[_-]?key|app[_-]?secret|private[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|id[_-]?token|gift[_-]?claim[_-]?token|jwt|password|signature|calldata|request\s+body)["']?\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;}]+)/gi,
      "$1[redacted]",
    )
    .replace(/\beyJ[a-z0-9_-]*\.[a-z0-9_-]+\.[a-z0-9_-]+/gi, "[redacted-jwt]")
    .replace(/\b0x[a-f0-9]{64,}\b/gi, "[redacted-hex]")
    .replace(/\bU[a-f0-9]{32}\b/g, "[redacted-line-id]");
}

function describeError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { name: "ThrownValue", message: redact(String(error)) };
  }
  const name = "name" in error && typeof error.name === "string" ? error.name : "Error";
  const message =
    "shortMessage" in error && typeof error.shortMessage === "string"
      ? error.shortMessage
      : "message" in error && typeof error.message === "string"
        ? error.message
        : "No error message supplied";
  const code =
    "code" in error && (typeof error.code === "string" || typeof error.code === "number")
      ? error.code
      : undefined;
  const status = "status" in error && typeof error.status === "number" ? error.status : undefined;
  const details =
    "details" in error && typeof error.details === "string" ? redact(error.details) : undefined;
  return {
    name: redact(name),
    message: redact(message),
    ...(code !== undefined && { code: typeof code === "string" ? redact(code) : code }),
    ...(status !== undefined && { status }),
    ...(details !== undefined && { details }),
  };
}

function errorCauses(error: unknown) {
  const causes: ReturnType<typeof describeError>[] = [];
  const seen = new Set<unknown>();
  let current = error;
  while (current !== undefined && current !== null && !seen.has(current)) {
    seen.add(current);
    causes.push(describeError(current));
    current = typeof current === "object" && "cause" in current ? current.cause : undefined;
  }
  return causes;
}

/** Longer causes are cut here, so the answer stays one line. */
export const CAUSE_MAX_LENGTH = 160;

/**
 * Why a failure happened, in the words of its innermost cause that says (an RPC's "rate limit
 * exceeded"), masked as the log is, so the person's own error can carry it.
 */
export function failureCause(error: unknown): string {
  const causes = errorCauses(error);
  const said = causes.findLast((cause) => cause.details) ?? causes.at(-1);
  const words = (said?.details ?? said?.message ?? "no reason given").replace(/\s+/g, " ").trim();
  return words.length > CAUSE_MAX_LENGTH ? `${words.slice(0, CAUSE_MAX_LENGTH - 1)}…` : words;
}

/**
 * The fields a log line keeps; any other key is dropped. Keyed by DiagnosticFields, so a field added
 * there can't be left out.
 */
const loggedFields = {
  stickerId: true,
  giftId: true,
  userId: true,
  artistId: true,
  recipientId: true,
  chainId: true,
  contractAddress: true,
  address: true,
  txHash: true,
  tokenId: true,
  blockNumber: true,
  status: true,
  elapsedMs: true,
  cached: true,
  recovered: true,
  mode: true,
  stage: true,
  errorCode: true,
  ticketDay: true,
  count: true,
  menu: true,
  returned: true,
  recorded: true,
  closed: true,
  left: true,
  failed: true,
} satisfies Record<keyof DiagnosticFields, true>;

const isLoggedField = (key: string): key is keyof DiagnosticFields =>
  Object.hasOwn(loggedFields, key);
const fieldNames = Object.keys(loggedFields).filter(isLoggedField);

function record(event: string, fields: DiagnosticFields) {
  const selected: Record<string, string | number | boolean> = {};
  for (const key of fieldNames) {
    const value = fields[key];
    if (value === undefined) continue;
    if (typeof value !== "string") {
      selected[key] = value;
    } else if (key === "txHash" || key === "giftId") {
      selected[key] = /^0x[a-f0-9]{64}$/i.test(value) ? value : "[invalid-hash]";
    } else if (key === "address" || key === "contractAddress") {
      selected[key] = /^0x[a-f0-9]{40}$/i.test(value) ? value : "[invalid-address]";
    } else {
      selected[key] = redact(value);
    }
  }
  return { timestamp: new Date().toISOString(), event, ...requests.getStore(), ...selected };
}

export function logInfo(event: string, fields: DiagnosticFields = {}) {
  console.info(JSON.stringify(record(event, fields)));
}

export function logFailure(event: string, error: unknown, fields: DiagnosticFields = {}) {
  console.error(JSON.stringify({ ...record(event, fields), causes: errorCauses(error) }));
}

/** The original rejection still reaches the caller; logging does not change retry semantics. */
export async function diagnosticStep<T>(
  event: string,
  fields: DiagnosticFields,
  action: () => Promise<T>,
): Promise<T> {
  const started = performance.now();
  logInfo(`${event}.started`, fields);
  try {
    const result = await action();
    logInfo(`${event}.completed`, {
      ...fields,
      elapsedMs: Math.round(performance.now() - started),
    });
    return result;
  } catch (error) {
    logFailure(`${event}.failed`, error, {
      ...fields,
      elapsedMs: Math.round(performance.now() - started),
    });
    throw error;
  }
}
