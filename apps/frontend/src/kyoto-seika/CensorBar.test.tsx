// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../api/testing";
import { kyotoSeika } from "../i18n/strings/kyotoSeika";
import { CensorBar } from "./CensorBar";

let unmount = () => {};
afterEach(() => unmount());

describe("CensorBar", () => {
  it("says why the word is blacked out when it's tapped, and keeps the tap from the switch it names", async () => {
    const outer = vi.fn();
    const view = renderWithApi(
      <label onClick={outer}>
        <CensorBar hidden="Sei" />
      </label>,
    );
    unmount = view.unmount;
    expect(view.host.querySelector(".censor-bar__why")).toBeNull();
    await act(async () => view.host.querySelector<HTMLElement>(".censor-bar")?.click());
    expect(view.host.querySelector(".censor-bar__why")?.textContent).toBe(kyotoSeika.censor.why.en);
    expect(outer).not.toHaveBeenCalled();
  });
});
