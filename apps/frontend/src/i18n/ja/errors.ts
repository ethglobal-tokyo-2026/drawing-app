import type { Translation } from "../catalog";
import type { errors as english } from "../en/errors";

export const errors: Translation<typeof english> = {
  sticker_not_found: "このシールは見つかりませんでした。",
};
