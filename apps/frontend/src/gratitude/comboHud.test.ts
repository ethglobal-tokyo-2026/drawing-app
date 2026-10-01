// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createComboHud } from "./comboHud";

describe("the HUD's amount", () => {
  it("tells the stylesheet how many digits it shows, so a long one can step down a size", () => {
    const host = document.createElement("div");
    const hud = createComboHud(host, {
      fullBar: 5,
      reduced: () => true,
      random: () => 0.5,
      hits: true,
    });
    hud.show(true);
    const told = () => Number(host.querySelector<HTMLElement>(".gr-amount")?.dataset.digits);
    const shown = () =>
      (host.querySelector(".gr-amount b")?.textContent ?? "").replace(/\D/g, "").length;

    // A step long enough that the count arrives at once, as it does while it counts up.
    for (const total of [7, 310, 1000, 12345]) {
      hud.step(1, { total, hits: 3, multiplier: 1, secondsLeft: 3, barFill: 0.5, running: true });
      expect(told()).toBe(shown());
    }
    hud.snapTotal(999);
    expect(told()).toBe(shown());
  });
});
