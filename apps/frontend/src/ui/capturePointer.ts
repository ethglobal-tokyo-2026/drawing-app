/**
 * Captures the pointer on `el`, so its moves and its lift reach `el` wherever they happen. A pointer
 * that's gone can't be captured: WebKit's can lift before its down is handled, and a synthetic event's
 * never existed. The gesture then carries on uncaptured; any other failure is thrown.
 */
export function capturePointer(el: Element, pointerId: number): void {
  try {
    el.setPointerCapture(pointerId);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error;
  }
}
