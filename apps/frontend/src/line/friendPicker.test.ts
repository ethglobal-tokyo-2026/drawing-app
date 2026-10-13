import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canOpenPicker,
  PickerSendError,
  sendInLineChat,
  type LiffPicker,
  type PickerMessage,
} from "./friendPicker";

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

async function pickerFailure(line: LiffPicker): Promise<PickerSendError> {
  try {
    await sendInLineChat(line, [message]);
  } catch (error) {
    if (error instanceof PickerSendError) return error;
    throw error;
  }
  throw new Error("The LINE send unexpectedly succeeded");
}

afterEach(() => {
  vi.restoreAllMocks();
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

  it("keeps LINE's original error fields and nested cause in copied details", async () => {
    const original = new Error("connection refused");
    Object.defineProperty(original, "stack", {
      value: "TypeError: connection refused\n    at fetch",
    });
    const cause = Object.assign(new Error("", { cause: original }), {
      code: "EXCEPTION_IN_SUBWINDOW",
      toJSON: () => {
        throw new Error("Original LINE errors must not be serialized directly");
      },
    });
    Object.defineProperty(cause, "stack", { value: "Error\n    at shareTargetPicker" });
    const line = fakeLine({ picker: () => Promise.reject(cause) });
    const sending = sendInLineChat(line, [message]);
    await expect(sending).rejects.toBeInstanceOf(PickerSendError);
    await expect(sending).rejects.toMatchObject({
      message: "LINE’s friend picker failed: EXCEPTION_IN_SUBWINDOW: (empty message)",
      mayHaveSent: true,
      cause,
      detail: [
        "LINE’s friend picker failed: EXCEPTION_IN_SUBWINDOW: (empty message)",
        "",
        '{\n  "name": "Error",\n  "code": "EXCEPTION_IN_SUBWINDOW",\n  "message": "",',
        '  "stack": "Error\\n    at shareTargetPicker",',
        '  "cause": {',
        '    "name": "Error",',
        '    "message": "connection refused",',
        '    "stack": "TypeError: connection refused\\n    at fetch"',
        "  }",
        "}",
      ].join("\n"),
    });
  });

  it("reports a cyclic LINE error cause without losing the picker failure", async () => {
    const cause = liffError("EXCEPTION_IN_SUBWINDOW");
    Object.assign(cause, { cause });
    const line = fakeLine({ picker: () => Promise.reject(cause) });
    const error = await pickerFailure(line);
    expect(error.detail).toContain('"cause": "(circular cause)"');
    expect(error.cause).toBe(cause);
  });

  it("keeps plain SDK cause objects and arrays in copied details", async () => {
    const original = { reason: "Launch failed", attempts: [{ result: "Launch failed" }] };
    const cause = new Error("subwindow closed", { cause: original });
    const line = fakeLine({ picker: () => Promise.reject(cause) });
    const error = await pickerFailure(line);
    expect(error.detail).toContain('"reason": "Launch failed"');
    expect(error.detail).toContain('"attempts": [\n      {\n        "result": "Launch failed"');
    expect(error.cause).toBe(cause);
    expect(error.mayHaveSent).toBe(true);
  });

  it("copies a native Error stack even when its descriptor is an accessor", async () => {
    const cause = liffError("EXCEPTION_IN_SUBWINDOW");
    const stack = cause.stack;
    const line = fakeLine({ picker: () => Promise.reject(cause) });
    const error = await pickerFailure(line);
    expect(error.detail).toContain(`"stack": ${JSON.stringify(stack)}`);
  });

  it("marks cause accessors without invoking them or changing the send failure", async () => {
    let read = false;
    const original = Object.defineProperty({}, "message", {
      enumerable: true,
      get: () => {
        read = true;
        throw new Error("cause message unavailable");
      },
    });
    const cause = liffError("EXCEPTION_IN_SUBWINDOW");
    Object.assign(cause, { cause: original });
    const line = fakeLine({ picker: () => Promise.reject(cause) });
    const error = await pickerFailure(line);
    expect(read).toBe(false);
    expect(error.detail).toContain('"message": "(accessor; value not read)"');
    expect(error.cause).toBe(cause);
    expect(error.mayHaveSent).toBe(true);
  });

  it("retains the send failure when the original cause cannot be inspected", async () => {
    const formattingError = new Error("cause properties unavailable");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const original = new Proxy(
      {},
      {
        ownKeys: () => {
          throw formattingError;
        },
      },
    );
    const cause = liffError("EXCEPTION_IN_SUBWINDOW");
    Object.assign(cause, { cause: original });
    const line = fakeLine({ picker: () => Promise.reject(cause) });
    const error = await pickerFailure(line);
    expect(error.detail).toContain("(LINE error detail formatting failed)");
    expect(error.cause).toBe(cause);
    expect(error.mayHaveSent).toBe(true);
    expect(logged).toHaveBeenCalledWith(
      "LINE’s friend picker error details could not be formatted",
      formattingError,
    );
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
