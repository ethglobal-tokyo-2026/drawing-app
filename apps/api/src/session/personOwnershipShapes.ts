import { z } from "zod";

/** Safe recovery context for the ownership operation that prevents selecting another person. */
export const pendingPersonOwnershipSchema = z.object({
  kind: z.enum(["mint", "deposit", "take_out", "claim", "return", "payment", "delivery"]),
  giftId: z.string().nullable(),
  stickerId: z.string().nullable(),
  stickerNo: z.number().int().positive().nullable(),
});
export type PendingPersonOwnership = z.infer<typeof pendingPersonOwnershipSchema>;
