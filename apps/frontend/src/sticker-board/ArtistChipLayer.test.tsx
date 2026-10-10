// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { people } from "../api/testFixtures";
import { renderWithApi } from "../api/testing";
import { toPerson, type PersonView } from "../api/views";
import { i18next } from "../i18n/i18n";
import { ArtistChipLayer } from "./ArtistChipLayer";
import { CHIP_ROOM, DROP, OVERHANG } from "./chipPlacement";

type Chip = ComponentProps<typeof ArtistChipLayer>["chips"][number];

const BOARD = { W: 390, H: 700 };
const [ken, mika, bob] = [people.ken, people.mika, people.bob].map(toPerson);

const chip = (artist: PersonView, box: Chip["box"]): Chip => ({
  id: `by-${artist.handle}`,
  artist,
  box,
});

let rendered: ReturnType<typeof renderWithApi> | undefined;
afterEach(() => rendered?.unmount());

function layer(chips: Chip[], onDone = () => {}) {
  rendered = renderWithApi(
    <ArtistChipLayer chips={chips} board={BOARD} onDone={onDone} reduced={false} />,
  );
  return rendered.host;
}

/** The chip naming `artist`, as the layer places it. */
function chipOf(host: HTMLElement, artist: PersonView) {
  const label = i18next.t(($) => $.stickers.artistChip.label, { name: `@${artist.handle}` });
  return host
    .querySelector(`[aria-label="${label}"]`)
    ?.closest<HTMLElement>(".artist-chip-layer__chip");
}

function spotOf(host: HTMLElement, artist: PersonView) {
  const el = chipOf(host, artist);
  if (!el) throw new Error(`no chip for @${artist.handle}`);
  return { left: parseFloat(el.style.left), top: parseFloat(el.style.top) };
}

describe("ArtistChipLayer", () => {
  it("puts each chip at its sticker's top-left corner, kept under the header and on the board", () => {
    const host = layer([
      chip(ken, { x: 200, y: 300, w: 100, h: 80 }),
      chip(mika, { x: 30, y: 40, w: 80, h: 80 }),
      chip(bob, { x: 380, y: 690, w: 80, h: 80 }),
    ]);
    expect(spotOf(host, ken)).toEqual({ left: 200 - 50 - OVERHANG.x, top: 300 - 40 - OVERHANG.y });
    expect(spotOf(host, mika)).toEqual({ left: CHIP_ROOM.left, top: CHIP_ROOM.top });
    expect(spotOf(host, bob)).toEqual({
      left: BOARD.W - CHIP_ROOM.fromRight,
      top: BOARD.H - CHIP_ROOM.fromFoot,
    });
  });

  it("drops a chip below each one in its way, placing them top to bottom", () => {
    // Given bottom first: the highest sticker keeps its spot, and each lower chip drops under it.
    const host = layer([
      chip(bob, { x: 190, y: 320, w: 100, h: 80 }),
      chip(mika, { x: 210, y: 310, w: 100, h: 80 }),
      chip(ken, { x: 200, y: 300, w: 100, h: 80 }),
    ]);
    const top = spotOf(host, ken).top;
    expect(spotOf(host, mika).top).toBe(top + DROP);
    expect(spotOf(host, bob).top).toBe(top + 2 * DROP);
  });

  it("lets each chip go as its flash ends, and is done after the last", () => {
    const onDone = vi.fn();
    const host = layer(
      [chip(ken, { x: 100, y: 200, w: 80, h: 80 }), chip(mika, { x: 260, y: 500, w: 80, h: 80 })],
      onDone,
    );
    const end = (artist: PersonView) =>
      act(() => {
        chipOf(host, artist)?.dispatchEvent(new Event("animationend", { bubbles: true }));
      });

    end(ken);
    expect(chipOf(host, ken)).toBeFalsy();
    expect(onDone).not.toHaveBeenCalled();
    end(mika);
    expect(chipOf(host, mika)).toBeFalsy();
    expect(onDone).toHaveBeenCalledOnce();
  });
});
