export type LineRejectionReason =
  | "token_invalid"
  | "token_expired"
  | "issuer_mismatch"
  | "audience_mismatch"
  | "nonce_mismatch"
  | "subject_mismatch";

type AuthFailureDetails =
  | {
      code: "invalid_request";
      reason:
        | "content_type_required"
        | "body_too_large"
        | "invalid_json"
        | "invalid_body"
        | "id_token_required"
        | "id_token_format";
    }
  | { code: "line_auth_failed"; reason: LineRejectionReason; upstreamStatus?: number }
  | {
      code: "line_unavailable";
      reason: "network_error" | "timeout" | "http_error" | "invalid_response" | "invalid_claims";
      upstreamStatus?: number;
    }
  | { code: "auth_unavailable"; reason: "unexpected_error" };

export const AUTH_FAILURE_STATUS: Record<AuthFailureDetails["code"], number> = {
  invalid_request: 400,
  line_auth_failed: 401,
  line_unavailable: 502,
  auth_unavailable: 500,
};

/** Only fixed diagnostic labels belong here: provider bodies and error causes can contain tokens. */
export class AuthError extends Error {
  constructor(readonly details: AuthFailureDetails) {
    super(details.reason);
    this.name = "AuthError";
  }
}

export function authFailureOf(error: unknown): AuthFailureDetails {
  return error instanceof AuthError
    ? error.details
    : { code: "auth_unavailable", reason: "unexpected_error" };
}
