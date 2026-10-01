import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it.each(["CREATE_SUBWINDOW_FAILED", "FORBIDDEN", "UNAUTHORIZED"])(
    "says the picker failed before it opened on %s, keeping LINE's error code",
    async (code) => {
      const line = fakeLine({ picker: () => Promise.reject(liffError(code)) });
      await expect(sendInLineChat(line, [message])).rejects.toThrow(
        new RegExp(`LINE’s friend picker failed.*${code}.*subwindow closed`),
      );
    },
  );

  it("reads a failure once the picker may have opened as unknown", async () => {
    const line = fakeLine({ picker: () => Promise.reject(liffError("EXCEPTION_IN_SUBWINDOW")) });
    expect(await sendInLineChat(line, [message])).toBe("unknown");
  });

  it("says the picker failed before it opened when asked for offline, since LIFF needs LINE first", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const line = fakeLine({ picker: () => Promise.reject(liffError("EXCEPTION_IN_SUBWINDOW")) });
    await expect(sendInLineChat(line, [message])).rejects.toThrow(/LINE’s friend picker failed/);
  });
});
