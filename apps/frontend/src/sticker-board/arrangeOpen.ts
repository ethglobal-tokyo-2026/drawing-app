import { personKey, readStored, writeStored } from "../ui/deviceStorage";

/** Whether a person left Arrange open on this device: it opens with every selection after, on every visit. */
const openKey = (userId: string) => personKey("draw.board.arrangeOpen", userId);

/** Whether `userId` left Arrange open on this device. */
export const arrangeLeftOpen = (userId: string) =>
  readStored(openKey(userId), "Whether Arrange was left open can't be read on this device").text ===
  "open";

/** Keeps whether `userId` has Arrange open, for their next selection and visit. */
export const keepArrangeOpen = (userId: string, open: boolean) =>
  writeStored(
    openKey(userId),
    open ? "open" : null,
    "Whether Arrange is open can't be kept on this device",
  );
