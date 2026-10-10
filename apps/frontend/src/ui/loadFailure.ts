import { messageOf } from "../i18n/errorMessage";

/** A lazy screen whose code didn't load: which one, and what the browser said, in English. */
export class LoadFailure extends Error {
  constructor(screen: string, cause: unknown) {
    const why = messageOf(cause);
    super(`The code for ${screen} didn't load: ${why}`, { cause });
    this.name = "LoadFailure";
  }
}
