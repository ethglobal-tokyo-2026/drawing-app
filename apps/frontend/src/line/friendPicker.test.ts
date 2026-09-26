import { describe, expect, it, vi } from "vitest";
import { canOpenPicker, sendInLineChat, type LiffPicker, type PickerMessage } from "./friendPicker";

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

describe("LINE's picker", () => {
  it("opens wherever LINE says the picker is available, in the LINE app or a browser", () => {
    expect(canOpenPicker(fakeLine())).toBe(true);
    expect(canOpenPicker(fakeLine({ pickerOn: false }))).toBe(false);
  });

  it("opens LINE's full picker, groups and recent chats included", async () => {
    const line = fakeLine();
    expect(await sendInLineChat(line, [message])).toBe("sent");
    expect(line.shareTargetPicker).toHaveBeenCalledWith([message], { isMultiple: true });
  });

  it("reads a picker closed without sending as cancelled", async () => {
    const line = fakeLine({ picker: () => Promise.resolve() });
    expect(await sendInLineChat(line, [message])).toBe("cancelled");
  });

  it("says the picker failed, keeping LINE's error code", async () => {
    const liffError = Object.assign(new Error("subwindow closed"), {
      code: "EXCEPTION_IN_SUBWINDOW",
    });
    const line = fakeLine({ picker: () => Promise.reject(liffError) });
    await expect(sendInLineChat(line, [message])).rejects.toThrow(
      /LINE’s friend picker failed.*EXCEPTION_IN_SUBWINDOW.*subwindow closed/,
    );
  });
});
