import { describe, expect, it, vi } from "vitest";
import {
  canPickOneFriend,
  sendToOneFriend,
  type LiffPicker,
  type PickerMessage,
} from "./friendPicker";

const message: PickerMessage = { type: "text", text: "hi" };

function fakeLine({
  pickerOn = true,
  picker = () => Promise.resolve({ status: "success" as const }),
}: {
  pickerOn?: boolean;
  picker?: LiffPicker["shareTargetPicker"];
} = {}) {
  return {
    // A browser outside the LINE app: LINE's availability check alone decides.
    isInClient: () => false,
    isApiAvailable: (api: string) => pickerOn && api === "shareTargetPicker",
    shareTargetPicker: vi.fn(picker),
  };
}

describe("LINE's one-friend picker", () => {
  it("opens wherever LINE says the picker is available, in the LINE app or a browser", () => {
    expect(canPickOneFriend(fakeLine())).toBe(true);
    expect(canPickOneFriend(fakeLine({ pickerOn: false }))).toBe(false);
  });

  it("sends to one friend only", async () => {
    const line = fakeLine();
    expect(await sendToOneFriend(line, [message])).toBe("sent");
    expect(line.shareTargetPicker).toHaveBeenCalledWith([message], { isMultiple: false });
  });

  it("reads a picker closed without sending as cancelled", async () => {
    const line = fakeLine({ picker: () => Promise.resolve() });
    expect(await sendToOneFriend(line, [message])).toBe("cancelled");
  });

  it("says the picker failed, keeping LINE's error code", async () => {
    const liffError = Object.assign(new Error("subwindow closed"), {
      code: "EXCEPTION_IN_SUBWINDOW",
    });
    const line = fakeLine({ picker: () => Promise.reject(liffError) });
    await expect(sendToOneFriend(line, [message])).rejects.toThrow(
      /LINE’s friend picker failed.*EXCEPTION_IN_SUBWINDOW.*subwindow closed/,
    );
  });
});
