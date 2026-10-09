// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import { mockPerson } from "../../line/liff";
import { SwitchPersonControls } from "./SwitchPersonControls";

// LIFF Mock signs the tab in here even where a real-LINE .env switches it off.
vi.mock("../../line/liff", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../line/liff")>()),
  liffMockActive: true,
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const strings = stickerBoard.developer.demoPeople;
let host: HTMLDivElement;
let root: Root;

/** The section with VITE_DEMO_PEOPLE set to `people`, in a tab LIFF Mock signed in as `signedIn`. */
function render(people: string, signedIn: string) {
  vi.stubEnv("VITE_DEMO_PEOPLE", people);
  mockPerson(`?as=${signedIn}`, sessionStorage);
  act(() => root.render(<SwitchPersonControls />));
}
const switchTo = (name: string) => strings.switchTo.en.replace("{{name}}", name);
const buttons = () => [...host.querySelectorAll("button")];
const button = (label: string) => {
  const found = buttons().find((b) => b.textContent === label);
  if (!found) throw new Error(`No "${label}" button`);
  return found;
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
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
});
