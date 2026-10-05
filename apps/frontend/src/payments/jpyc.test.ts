import { describe, expect, it, vi } from "vitest";
import { getTicketPayments, type JpycPayment } from "./jpyc";

const query = vi.hoisted(() => vi.fn());
vi.mock("@mysten/sui/graphql", () => ({
  SuiGraphQLClient: class {
    query = query;
  },
}));

const PAYMENT: JpycPayment = {
  network: "testnet",
  coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
  decimals: 6,
  paymentPackage: `0x${"b".repeat(64)}`,
  vault: `0x${"c".repeat(64)}`,
};
const WALLET = `0x${"1".repeat(64)}`;

/** A payment from the wallet into the Shop's vault, as Sui's GraphQL prints it: its reference in base64. */
const paid = (digest: string, reference: string) => ({
  timestamp: "2026-10-05T03:00:00.000Z",
  contents: {
    json: {
      vault_id: PAYMENT.vault,
      payer: WALLET,
      amount: "100000000",
      reference: btoa(reference),
    },
  },
  transaction: { digest },
});

describe("getTicketPayments", () => {
  it("lists only the wallet's payments whose reference names one of this account's purchases", async () => {
    query.mockResolvedValue({
      data: {
        events: {
          pageInfo: { hasPreviousPage: false, startCursor: null },
          nodes: [
            paid("an earlier account's", "tickets:user-before:1"),
            paid("for no purchase", "order-17"),
            paid("yours", "tickets:user-you:3"),
          ],
        },
      },
    });
    const { payments } = await getTicketPayments(WALLET, "user-you", PAYMENT);
    expect(payments.map((p) => p.digest)).toEqual(["yours"]);
  });
});
