// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Person } from "../api/contract";
import { gift, people, sticker } from "../api/mock/fixtures";
import { renderWithApi } from "../api/testing";
import { toPerson, toSticker } from "../api/views";
import { formatDuration } from "../stickers/format";
import { SendGratitudeSheet } from "./SendGratitudeSheet";

const onSend = vi.fn();
const onLater = vi.fn();
let unmount = () => {};

afterEach(() => {
  unmount();
  onSend.mockReset();
  onLater.mockReset();
});

/** The sheet for a sticker `artist` drew, just received from `giver`. */
function open(giver: Person, artist: Person) {
  const drawn = toSticker(sticker({ artist }));
  const view = renderWithApi(
    <SendGratitudeSheet
      gift={gift()}
      sticker={drawn}
      giver={toPerson(giver)}
      onSend={onSend}
      onLater={onLater}
    />,
  );
  unmount = view.unmount;
  const text = (selector: string) => view.host.querySelector(selector)?.textContent ?? "";
  return { drawn, host: view.host, title: text("h2"), line: text("p") };
}

const button = (name: string) => {
  const found = [...document.querySelectorAll("button")].find(
    (b) => (b.getAttribute("aria-label") ?? b.textContent?.trim()) === name,
  );
  if (!found) throw new Error(`no "${name}" button`);
  return found;
};

describe("SendGratitudeSheet", () => {
  it("says the giver drew it, and how long it took, when they're its Original Artist", () => {
    const { drawn, line } = open(people.mika, people.mika);
    expect(line).toContain(`@mika drew it in ${formatDuration(drawn.timeUsed)}`);
  });

  it("names and pictures the giver, not the artist, when someone else drew it", () => {
    const { host, title, line } = open(people.ken, people.mika);
    expect(title).toContain("@ken");
    expect(line).toContain("from @ken");
    expect(line).not.toContain("drew");
    expect(host.querySelector("img")?.getAttribute("src")).toBe(people.ken.linePictureUrl);
  });

  it("sends gratitude from its key, and leaves it for later from Later or its perforation", () => {
    const { title } = open(people.ken, people.mika);
    act(() => button("Send gratitude").click());
    expect(onSend).toHaveBeenCalledOnce();
    act(() => button("Later").click());
    act(() => {
      button(`Close ${title}`).dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(onLater).toHaveBeenCalledTimes(2);
    expect(onSend).toHaveBeenCalledOnce();
  });
});
