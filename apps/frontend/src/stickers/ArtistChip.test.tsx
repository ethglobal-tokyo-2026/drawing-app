// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { people } from "../api/testFixtures";
import { renderWithApi } from "../api/testing";
import { toPerson } from "../api/views";
import { ArtistChip } from "./ArtistChip";

const ken = toPerson(people.ken);

let rendered: ReturnType<typeof renderWithApi> | undefined;
afterEach(() => rendered?.unmount());

/** The chip `ui` renders, found by its role. */
function noteOf(ui: ReactNode) {
  rendered = renderWithApi(ui);
  const note = rendered.host.querySelector('[role="note"]');
  if (!note) throw new Error("no note rendered");
  return note;
}

describe("ArtistChip", () => {
  it("names the artist over their handle", () => {
    const note = noteOf(<ArtistChip artist={ken} />);
    expect(note.getAttribute("aria-label")).toBe("Artist: @ken");
    expect(note.textContent).toBe("Artist @ken");
  });

  it("reads By and the handle in the by variant", () => {
    const note = noteOf(<ArtistChip artist={ken} variant="by" />);
    expect(note.getAttribute("aria-label")).toBe("Artist: @ken");
    expect(note.textContent).toBe("By @ken");
  });

  it("names an artist without a handle by their LINE name", () => {
    const note = noteOf(<ArtistChip artist={{ ...ken, handle: null }} />);
    expect(note.getAttribute("aria-label")).toBe(`Artist: ${ken.name}`);
    expect(note.textContent).toBe(`Artist ${ken.name}`);
  });

  it("wears the foil ring on a board, and the plain one off a board has only the white edge", () => {
    const withPicture = { ...ken, pictureUrl: "https://profile.line-scdn.test/ken" };
    const ring = (note: Element) => note.querySelector(".artist-chip__ring");
    expect(ring(noteOf(<ArtistChip artist={withPicture} />))).not.toBeNull();
    rendered?.unmount();

    const plain = noteOf(<ArtistChip artist={withPicture} plain />);
    expect(ring(plain)).toBeNull();
    expect(plain.querySelector("img.artist-chip__face")?.getAttribute("src")).toBe(
      withPicture.pictureUrl,
    );
    expect(plain.getAttribute("aria-label")).toBe("Artist: @ken");
  });
});
