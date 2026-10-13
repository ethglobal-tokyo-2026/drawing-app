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

  it("rejects before opening where LINE resolves before anything is sent", async () => {
    const line = fakeLine({ picker: () => Promise.resolve(), lineVersion: "10.10.0" });
    const sending = sendInLineChat(line, [message]);
    await expect(sending).rejects.toMatchObject({
      name: "PickerSendError",
      mayHaveSent: false,
    });
    await expect(sending).rejects.toThrow(/10\.11\.0/);
    expect(line.shareTargetPicker).not.toHaveBeenCalled();
  });

  it("rejects before opening when LINE reports the picker unavailable", async () => {
    const line = fakeLine({ pickerOn: false });
    const sending = sendInLineChat(line, [message]);
    await expect(sending).rejects.toMatchObject({
      name: "PickerSendError",
      mayHaveSent: false,
    });
    await expect(sending).rejects.toThrow(/unavailable/);
    expect(line.shareTargetPicker).not.toHaveBeenCalled();
  });

  it.each([null, "10.11.0", "11.0.0"])(
    "reads an empty answer as cancelled in a browser or supported LINE %s",
    async (lineVersion) => {
      const line = fakeLine({ picker: () => Promise.resolve(), lineVersion });
      expect(await sendInLineChat(line, [message])).toBe("cancelled");
    },
  );

  it.each([
    "INVALID_ARGUMENT",
    "INVALID_CONFIG",
    "CREATE_SUBWINDOW_FAILED",
    "FORBIDDEN",
    "UNAUTHORIZED",
  ])("says the picker failed before it opened on %s, keeping LINE's error code", async (code) => {
    const cause = liffError(code);
    const line = fakeLine({ picker: () => Promise.reject(cause) });
    const sending = sendInLineChat(line, [message]);
    await expect(sending).rejects.toMatchObject({
      name: "PickerSendError",
      mayHaveSent: false,
      cause,
    });
    await expect(sending).rejects.toThrow(
      new RegExp(`LINE’s friend picker failed.*${code}.*subwindow closed`),
    );
  });

  it("rejects a failure once the picker may have opened, preserving LINE's error", async () => {
    const cause = liffError("EXCEPTION_IN_SUBWINDOW");
    const line = fakeLine({ picker: () => Promise.reject(cause) });
    const sending = sendInLineChat(line, [message]);
    await expect(sending).rejects.toMatchObject({
      name: "PickerSendError",
      mayHaveSent: true,
      cause,
    });
    await expect(sending).rejects.toThrow(/EXCEPTION_IN_SUBWINDOW.*subwindow closed/);
  });

  it("rejects before opening when offline, since LIFF needs LINE first", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const line = fakeLine();
    const sending = sendInLineChat(line, [message]);
    await expect(sending).rejects.toMatchObject({
      name: "PickerSendError",
      mayHaveSent: false,
    });
    await expect(sending).rejects.toThrow(/offline/);
    expect(line.shareTargetPicker).not.toHaveBeenCalled();
  });
});
