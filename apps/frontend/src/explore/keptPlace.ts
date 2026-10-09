/**
 * The reader's place in a scrolled view, kept while what it shows is laid out anew at another width:
 * the marker nearest the view's top stays the same share of itself below the top.
 */

/** Something a place is kept by, as laid out now: its top below the view's top, and its height, px. */
export interface Marker {
  key: string;
  top: number;
  height: number;
}

/** A place: its marker, and how far below the view's top that marker's top was, in its own heights. */
export interface Place {
  key: string;
  at: number;
}

/** The place in a view `height` px tall: the marker it shows nearest its top, or null if it shows none. */
export function placeOf(markers: readonly Marker[], height: number): Place | null {
  let nearest: Marker | null = null;
  for (const marker of markers) {
    const shown = marker.height > 0 && marker.top < height && marker.top + marker.height > 0;
    if (shown && (!nearest || Math.abs(marker.top) < Math.abs(nearest.top))) nearest = marker;
  }
  return nearest && { key: nearest.key, at: nearest.top / nearest.height };
}

/** How far to scroll so `marker`, laid out anew, sits where `place` had it. */
export const scrollToKeep = (place: Place, marker: Marker) => marker.top - place.at * marker.height;
