// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { renderInHost } from "../../ui/testing";
import { KeptDrawingRecovery } from "./KeptDrawingRecovery";
import type { KeptSession } from "./keptSession";

afterEach(() => {
  vi.restoreAllMocks();
});

it("offers complete recovery download before explicit replacement", async () => {
  const recovery: Extract<KeptSession, { status: "unverified" }> = {
    status: "unverified",
    ticket: 7,
    kyotoSeika: null,
    reason: "legacy",
    recovery: {
      steps: [
        {
          tool: "brush",
          layer: 1,
          color: "red",
          pts: Array.from({ length: 12000 }, (_, i) => i),
          T: 4,
        },
        { tool: "clear", layer: 1, T: 5 },
      ],
      frame: { w: 374, h: 748, density: 2 },
    },
    error: new Error("Missing identity"),
  };
  let downloaded: Blob | undefined;
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    if (blob instanceof Blob) downloaded = blob;
    return "blob:recovery";
  });
  let filename: string | undefined;
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download;
  });
  const discard = vi.fn();
  const close = vi.fn();
  const view = renderInHost(
    <KeptDrawingRecovery
      recovery={recovery}
      reconciliation={{ status: "resolved", outcome: "unsealed" }}
      onDiscard={discard}
      onClose={close}
    />,
  );
  onTestFinished(view.unmount);
  const buttons = [...view.host.querySelectorAll("button")];
  const download = buttons.find((button) => button.textContent === "Download saved drawing");
  const replace = buttons.find(
    (button) => button.textContent === "Discard saved drawing and start blank",
  );
  expect(download).toBeDefined();
  expect(replace).toBeDefined();
  expect(downloaded).toBeUndefined();
  act(() => download?.click());
  expect(filename).toBe("croquis-recovered-drawing.json");
  if (!downloaded) throw new Error("The download did not contain a file");
  expect(JSON.parse(await downloaded.text())).toEqual(recovery.recovery);
  expect(discard).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  act(() => replace?.click());
  expect(discard).toHaveBeenCalledOnce();
});
