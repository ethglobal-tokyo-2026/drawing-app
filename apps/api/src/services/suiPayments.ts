import type { SuiPayments } from "../deps.ts";

/** The mock Sui purchase: every payment verifies at once, until real payments. */
export const mockSuiPayments: SuiPayments = { verifyPayment: () => Promise.resolve(true) };
