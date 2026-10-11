// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setPrivyStatus } from "../../identity/privy";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import { renderInHost } from "../../ui/testing";
import { AddressPapers } from "./AddressPapers";
import { useSuiAddress } from "./addresses";

let unmount = () => {};
afterEach(() => {
  unmount();
  vi.restoreAllMocks();
});

/** Your Sui address paper, showing what useSuiAddress gives it. */
function YourPaper() {
  return <AddressPapers sui={useSuiAddress()} lifted={false} paperRef={null} onOpen={() => {}} />;
}

describe("useSuiAddress", () => {
  it("ends as an address that didn't load, with nothing to try again, while Privy is off", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    setPrivyStatus({ state: "off" });
    const view = renderInHost(<YourPaper />);
    unmount = view.unmount;
    const { sui, tryAgain } = stickerBoard.addresses;
    expect(view.host.textContent).toContain(sui.didntLoad.en);
    expect(view.host.textContent).not.toContain(tryAgain.en);
  });

  it("offers Reload on your Sui address paper after a provider failure", () => {
    act(() =>
      setPrivyStatus({ state: "failed", reason: "Wallet provider stopped", reloadRequired: true }),
    );
    const view = renderInHost(<YourPaper />);
    unmount = view.unmount;
    expect(view.host.textContent).toContain("Reload");
    expect(view.host.textContent).not.toContain(stickerBoard.addresses.tryAgain.en);
  });
});
