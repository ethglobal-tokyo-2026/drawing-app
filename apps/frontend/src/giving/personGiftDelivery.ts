import type { Gift } from "@drawing-app/api/client";
import type { ApiClient } from "../api/apiClient";

/** Resolve sent reports from the persisted gift, including recovery after a page reload. */
export async function reportGiftDelivery(
  api: Pick<ApiClient, "reportShared" | "giftDelivery" | "deliverPersonGift">,
  giftId: string,
  attemptId: string,
  outcome: "sent" | "cancelled",
): Promise<Gift> {
  if (outcome === "sent" && (await api.giftDelivery(giftId)).delivery === "person") {
    return api.deliverPersonGift(giftId, attemptId);
  }
  return api.reportShared(giftId, attemptId, outcome);
}
