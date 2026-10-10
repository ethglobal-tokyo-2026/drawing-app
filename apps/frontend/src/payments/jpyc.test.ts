import { describe, expect, it, vi } from "vitest";
import { getTicketPayments, type JpycPayment } from "./jpyc";

const { query } = vi.hoisted(() => ({
  query: vi.fn<(request: { variables: { type: string } }) => Promise<unknown>>(),
}));
vi.mock("@mysten/sui/graphql", () => ({
  SuiGraphQLClient: class {
    query = query;
  },
}));

const OWNER = `0x${"d".repeat(64)}`;
/** A payment package upgraded once: calls go to the new version, events keep the original's ID. */
const PAYMENT: JpycPayment = {
  network: "testnet",
  coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
  decimals: 6,
  paymentPackage: `0x${"b".repeat(64)}`,
  originalPackage: `0x${"e".repeat(64)}`,
  vault: `0x${"c".repeat(64)}`,
};

describe("getTicketPayments", () => {
  it("lists PaymentReceived by the payment package's original ID, which its events keep after an upgrade", async () => {
    query.mockResolvedValue({
      data: { events: { pageInfo: { hasPreviousPage: false, startCursor: null }, nodes: [] } },
    });
    await getTicketPayments(OWNER, PAYMENT);
    expect(query.mock.lastCall?.[0].variables.type).toBe(
      `${PAYMENT.originalPackage}::payment::PaymentReceived`,
    );
  });
});
