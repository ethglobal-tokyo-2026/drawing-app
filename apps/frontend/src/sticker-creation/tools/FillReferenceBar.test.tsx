// @vitest-environment happy-dom
import { act, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { i18next } from "../../i18n/i18n";
import type { FillReference } from "../canvas/ops";
import { testHost } from "../layers/testHost";
import { FillReferenceBar } from "./FillReferenceBar";

const { render, find, click } = testHost();

function Screen() {
  const [value, setValue] = useState<FillReference>("layer");
  return <FillReferenceBar value={value} onChange={setValue} />;
}

afterEach(async () => {
  await act(async () => i18next.changeLanguage("en"));
});

describe("FillReferenceBar", () => {
  it("offers one named native radio group and changes the checked source", () => {
    render(<Screen />);
    const group = find('[role="radiogroup"]');
    expect(group.getAttribute("aria-label")).toBe("Fill reference");
    const radios = Array.from(group.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    expect(radios.map((radio) => radio.value)).toEqual(["layer", "visible"]);
    expect(radios[0].name).toBe(radios[1].name);
    expect(radios.map((radio) => radio.checked)).toEqual([true, false]);
    expect(group.textContent).not.toContain("Visible ink sets the boundary");
    expect(radios[0].parentElement?.textContent).toBe("This layer");
    expect(radios[1].parentElement?.textContent).toBe("Visible layers");
    click(radios[1]);
    expect(radios.map((radio) => radio.checked)).toEqual([false, true]);
    expect(group.textContent).toContain(
      "Visible ink sets the boundary. Paint stays on this layer.",
    );
    expect(radios[1].getAttribute("aria-describedby")).toBeTruthy();
  });

  it("names both choices in Japanese", async () => {
    await act(async () => i18next.changeLanguage("ja"));
    render(<Screen />);
    expect(find('[role="radiogroup"]').getAttribute("aria-label")).toBe("塗りつぶしの参照");
    expect(find('input[value="layer"]').parentElement?.textContent).toBe("このレイヤー");
    expect(find('input[value="visible"]').parentElement?.textContent).toBe("表示中のレイヤー");
  });
});
