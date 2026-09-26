import { describe, expect, it } from "vitest";
import { recordGratitudeBody } from "../testing";
import { createGratitudeMock } from "./gratitude";

describe("the gratitude mock", () => {
  it("records one combo per idempotency key and one per gift", async () => {
    const { recordGratitude } = createGratitudeMock(() => 0);
    const first = await recordGratitude(recordGratitudeBody({ total: 10 }));
    // The same key again is a resend: the stored record comes back.
    await expect(recordGratitude(recordGratitudeBody({ total: 99 }))).resolves.toEqual(first);
    await expect(
      recordGratitude(recordGratitudeBody({ idempotencyKey: "another" })),
    ).rejects.toMatchObject({ status: 409, code: "gratitude_already_recorded" });
    await expect(
      recordGratitude(recordGratitudeBody({ idempotencyKey: "another", giftId: "g2" })),
    ).resolves.toMatchObject({ gratitude: { giftId: "g2" } });
  });
});
