// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { setPrivyStatus } from "../../identity/privy";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
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
    const view = renderWithApi(<YourPaper />);
    unmount = view.unmount;
    const { sui, tryAgain } = stickerBoard.addresses;
    expect(view.host.textContent).toContain(sui.didntLoad.en);
    expect(view.host.textContent).not.toContain(tryAgain.en);
  });
});
