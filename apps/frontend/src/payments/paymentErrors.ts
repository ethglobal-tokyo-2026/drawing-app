/**
 * How a ticket payment fails before it's sent or as Sui runs it. They sit apart from jpyc.ts, whose Sui
 * SDK loads only with the checkout, so the checkout can tell them apart without loading it. Their
 * messages are for logs; the checkout says each in the catalog.
 */

/** Signing a ticket payment took too long, so it was never sent and no JPYC moved. */
export class SigningTimedOut extends Error {
  constructor() {
    super("Building and signing the ticket payment took too long, so it was never sent");
  }
}

/** Sui ran a ticket payment and it failed, so no JPYC moved. `why` is Sui's own words. */
export class PaymentFailed extends Error {
  readonly digest: string;
  readonly why: string;

  constructor(digest: string, why: string) {
    super(`Sui ran the payment ${digest}, and it failed: ${why}`);
    this.digest = digest;
    this.why = why;
  }
}
