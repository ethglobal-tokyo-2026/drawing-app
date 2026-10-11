/** Require a reload to reuse the same HttpOnly session without creating another. */
export function assertSessionPersisted(
  before: { cookie: string; created: number },
  after: { cookie: string; created: number; meStatus: number },
): void {
  if (after.created !== before.created) {
    throw new Error("Session reauthentication occurred during the reload");
  }
  if (!before.cookie || !after.cookie) {
    throw new Error("The session cookie is missing before or after the reload");
  }
  if (after.cookie !== before.cookie) {
    throw new Error("The session cookie changed during the reload");
  }
  if (after.meStatus !== 200) {
    throw new Error(`GET /api/me failed after the reload (${after.meStatus})`);
  }
}
