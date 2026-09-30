import { describe, expect, it, vi } from "vitest";
import { canOpenPicker, sendInLineChat, type LiffPicker, type PickerMessage } from "./friendPicker";

const message: PickerMessage = { type: "text", text: "hi" };

function fakeLine({
  pickerOn = true,
  picker = () => Promise.resolve({ status: "success" as const }),
  lineVersion = null,
}: {
  pickerOn?: boolean;
  picker?: LiffPicker["shareTargetPicker"];
  /** Inside the LINE app at this version; null for a browser outside it. */
  lineVersion?: string | null;
} = {}) {
  return {
    isInClient: () => lineVersion !== null,
    getLineVersion: () => lineVersion,
    isApiAvailable: (api: string) => pickerOn && api === "shareTargetPicker",
    shareTargetPicker: vi.fn(picker),
  };
}

const liffError = (code: string) => Object.assign(new Error("subwindow closed"), { code });

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
    const line = fakeLine({ picker: () => Promise.resolve(), lineVersion: "15.12.0" });
    expect(await sendInLineChat(line, [message])).toBe("cancelled");
  });

  it("reads an empty answer as unknown where LINE resolves before anything is sent", async () => {
    const line = fakeLine({ picker: () => Promise.resolve(), lineVersion: "10.10.0" });
    expect(await sendInLineChat(line, [message])).toBe("unknown");
  });

  it("says the picker failed before it opened, keeping LINE's error code", async () => {
    const line = fakeLine({ picker: () => Promise.reject(liffError("CREATE_SUBWINDOW_FAILED")) });
    await expect(sendInLineChat(line, [message])).rejects.toThrow(
      /LINE’s friend picker failed.*CREATE_SUBWINDOW_FAILED.*subwindow closed/,
    );
  });

  it("reads a failure once the picker may have opened as unknown", async () => {
    const line = fakeLine({ picker: () => Promise.reject(liffError("EXCEPTION_IN_SUBWINDOW")) });
    expect(await sendInLineChat(line, [message])).toBe("unknown");
  });
});
