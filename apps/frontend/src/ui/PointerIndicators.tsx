import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { isPalm, isStylus } from "../sticker-creation/canvas/gestures";
import { usePointerIndicators } from "./pointerIndicatorsSetting";
import "./pointer-indicators.css";

/** Optional visual feedback over every screen, without taking input or becoming sticker ink. */
export function PointerIndicators() {
  const enabled = usePointerIndicators();
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = host.current;
    if (!enabled || !overlay) return;
    const cursors = new Map<
      number,
      { element: HTMLSpanElement; type: string; contactId: number | null }
    >();
    const ripples = new Map<HTMLSpanElement, ReturnType<typeof setTimeout>>();
    const penContacts = new Map<number, Set<"pointer" | "touch">>();

    const removeCursor = (id: number) => {
      cursors.get(id)?.element.remove();
      cursors.delete(id);
    };
    const positionCursor = (
      element: HTMLSpanElement,
      point: { clientX: number; clientY: number },
      contact: boolean,
    ) => {
      element.style.transform = `translate(${point.clientX}px, ${point.clientY}px)`;
      element.toggleAttribute("data-contact", contact);
    };
    const showCursor = (
      event: Pick<PointerEvent, "pointerId" | "pointerType" | "clientX" | "clientY">,
      contact: boolean,
    ) => {
      let cursor = cursors.get(event.pointerId);
      // WebKit can give one Pencil different IDs for hover and contact. Reuse its one ring.
      if (!cursor && event.pointerType === "pen") {
        for (const [id, previous] of cursors) {
          if (previous.type !== "pen") continue;
          cursors.delete(id);
          cursor = previous;
          cursors.set(event.pointerId, cursor);
          break;
        }
      }
      if (!cursor) {
        const element = document.createElement("span");
        element.className = "pointer-indicators__cursor";
        cursor = { element, type: event.pointerType, contactId: contact ? event.pointerId : null };
        cursors.set(event.pointerId, cursor);
        overlay.append(element);
      }
      // Keep contact lifetime separate from a movement event's buttons or hover presentation.
      if (contact) cursor.contactId ??= event.pointerId;
      positionCursor(cursor.element, event, contact);
      return cursor;
    };
    const showRipple = (point: { clientX: number; clientY: number }) => {
      const ripple = document.createElement("span");
      ripple.className = "pointer-indicators__ripple";
      ripple.style.transform = `translate(${point.clientX}px, ${point.clientY}px)`;
      overlay.append(ripple);
      // Removal is timed independently of CSS animation events, including in reduced motion.
      ripples.set(
        ripple,
        setTimeout(() => {
          ripple.remove();
          ripples.delete(ripple);
        }, 500),
      );
    };
    const penDown = (
      point: { pointerId: number; clientX: number; clientY: number },
      source: "pointer" | "touch",
    ) => {
      showCursor({ ...point, pointerType: "pen" }, true).contactId = point.pointerId;
      // WebKit uses the same ID for a stylus Touch and its contact PointerEvent.
      const received = penContacts.get(point.pointerId);
      if (received && !received.has(source)) {
        received.add(source);
        return;
      }
      // Another start from the same event family is a new contact, even if its lift was missed.
      penContacts.set(point.pointerId, new Set([source]));
      showRipple(point);
    };
    const down = (event: PointerEvent) => {
      if (
        (event.pointerType === "mouse" && event.button !== 0) ||
        (event.pointerType === "touch" && isPalm(event.width, event.height))
      )
        return;
      if (event.pointerType === "pen") penDown(event, "pointer");
      else {
        showCursor(event, true).contactId = event.pointerId;
        showRipple(event);
      }
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" && !cursors.has(event.pointerId)) return;
      showCursor(event, event.buttons !== 0);
    };
    const cursorIdForEnd = (event: PointerEvent) => {
      // A contact's terminal event may follow hover that already rekeyed the Pencil ring.
      if (event.pointerType === "pen")
        for (const [id, cursor] of cursors)
          if (cursor.type === "pen" && cursor.contactId === event.pointerId) return id;
      return event.pointerId;
    };
    const up = (event: PointerEvent) => {
      if (event.pointerType === "pen") penContacts.delete(event.pointerId);
      if (event.pointerType === "mouse") {
        showCursor(event, false).contactId = null;
      } else removeCursor(cursorIdForEnd(event));
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerType === "pen") penContacts.delete(event.pointerId);
      removeCursor(cursorIdForEnd(event));
    };
    const out = (event: PointerEvent) => {
      if (event.relatedTarget === null) removeCursor(event.pointerId);
    };
    const clear = () => {
      penContacts.clear();
      for (const id of cursors.keys()) removeCursor(id);
      for (const [ripple, timer] of ripples) {
        clearTimeout(timer);
        ripple.remove();
      }
      ripples.clear();
    };
    const hidden = () => {
      if (document.hidden) clear();
    };
    const touchStarted = (event: TouchEvent) => {
      // Rapid Pencil taps can arrive as stylus touchstart without pointerdown.
      for (const touch of Array.from(event.changedTouches))
        if (isStylus(touch))
          penDown(
            { pointerId: touch.identifier, clientX: touch.clientX, clientY: touch.clientY },
            "touch",
          );
    };
    const touchMoved = (event: TouchEvent) => {
      // Some Pencil movement arrives as touchmove without a corresponding pointermove.
      const pencil = Array.from(event.changedTouches).find(isStylus);
      if (!pencil) return;
      for (const cursor of cursors.values())
        if (cursor.type === "pen" && cursor.contactId !== null)
          positionCursor(cursor.element, pencil, true);
    };
    const touchLifted = (event: TouchEvent) => {
      // Safari can miss Pencil pointerup even while a finger remains down.
      const penLifted = Array.from(event.changedTouches).some(isStylus);
      for (const touch of Array.from(event.changedTouches))
        if (isStylus(touch)) penContacts.delete(touch.identifier);
      if (event.touches.length === 0) penContacts.clear();
      for (const [id, cursor] of cursors)
        if (
          (penLifted && cursor.type === "pen") ||
          (event.touches.length === 0 && cursor.type !== "mouse" && cursor.contactId !== null)
        )
          removeCursor(id);
    };
    const lostCapture = (event: PointerEvent) => {
      const id = cursorIdForEnd(event);
      const cursor = cursors.get(id);
      if (cursor && cursor.contactId !== null) removeCursor(id);
    };
    const listening = { capture: true, passive: true };
    document.addEventListener("pointerdown", down, listening);
    document.addEventListener("pointermove", move, listening);
    document.addEventListener("pointerup", up, listening);
    document.addEventListener("pointercancel", cancel, listening);
    document.addEventListener("pointerout", out, listening);
    document.addEventListener("lostpointercapture", lostCapture, listening);
    document.addEventListener("touchstart", touchStarted, listening);
    document.addEventListener("touchmove", touchMoved, listening);
    document.addEventListener("touchend", touchLifted, listening);
    document.addEventListener("touchcancel", touchLifted, listening);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("blur", clear);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", cancel, true);
      document.removeEventListener("pointerout", out, true);
      document.removeEventListener("lostpointercapture", lostCapture, true);
      document.removeEventListener("touchstart", touchStarted, true);
      document.removeEventListener("touchmove", touchMoved, true);
      document.removeEventListener("touchend", touchLifted, true);
      document.removeEventListener("touchcancel", touchLifted, true);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, [enabled]);

  return enabled
    ? createPortal(
        <div ref={host} className="pointer-indicators" aria-hidden="true" />,
        document.body,
      )
    : null;
}
