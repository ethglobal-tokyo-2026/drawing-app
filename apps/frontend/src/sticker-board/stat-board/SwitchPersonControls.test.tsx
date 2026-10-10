// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildGiftMessage } from "../../giving/giftMessage";
import { keepMockGiftMessage } from "../../giving/mockGiftMessages";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import { mockPerson } from "../../line/liff";
import { buttonNamed, renderInHost, type HostView } from "../../ui/testing";
import { SwitchPersonControls } from "./SwitchPersonControls";

// LIFF Mock signs the tab in here even where a real-LINE .env switches it off.
vi.mock("../../line/liff", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../line/liff")>()),
  liffMockActive: true,
}));

const strings = stickerBoard.developer.demoPeople;
let view: HostView;

/** The section with VITE_DEMO_PEOPLE set to `people`, in a tab LIFF Mock signed in as `signedIn`. */
function render(people: string, signedIn: string) {
  vi.stubEnv("VITE_DEMO_PEOPLE", people);
  mockPerson(`?as=${signedIn}`, sessionStorage);
  view.rerender(<SwitchPersonControls />);
}
const switchTo = (name: string) => strings.switchTo.en.replace("{{name}}", name);
const buttons = () => [...view.host.querySelectorAll("button")];
const button = (label: string) => buttonNamed(view.host, label);

beforeEach(() => {
  view = renderInHost();
});

afterEach(() => {
  view.unmount();
  sessionStorage.clear();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("SwitchPersonControls", () => {
  it("offers each of the demo's people but the one signed in", () => {
    render("alice, Bob ,carol", "bob");
    expect(buttons().map((b) => b.textContent)).toEqual([switchTo("Alice"), switchTo("Carol")]);
  });

  it("reloads the app signed in as the person pressed", () => {
    const assign = vi.spyOn(location, "assign").mockImplementation(() => {});
    render("alice,bob", "alice");
    act(() => button(switchTo("Bob")).click());
    expect(assign).toHaveBeenCalledWith("/?as=bob");
  });

  it("opens a Gift Message LIFF Mock's picker sent as the person pressed, once", () => {
    const assign = vi.spyOn(location, "assign").mockImplementation(() => {});
    render("alice,bob", "alice");
    keepMockGiftMessage(
      buildGiftMessage({
        liffId: "test-liff",
        giftClaimToken: "0xclaim",
        fromHandle: "alice",
        no: 1,
        timeUsed: 60,
        language: "en",
      }),
    );
    act(() => button(switchTo("Bob")).click());
    act(() => button(switchTo("Bob")).click());
    expect(assign.mock.calls).toEqual([["/g/0xclaim?as=bob"], ["/?as=bob"]]);
  });
});
