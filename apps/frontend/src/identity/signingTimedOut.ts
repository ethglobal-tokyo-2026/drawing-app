/**
 * Signing a sponsored Sui transaction took too long, so its signature is never posted and nothing
 * ran. It sits apart from suiSigner.ts, whose Sui SDK loads only with what signs, so a screen can
 * tell it apart without loading the SDK.
 */
export class SigningTimedOut extends Error {
  constructor() {
    super("Signing the Sui transaction took too long, so it was never sent");
  }
}
