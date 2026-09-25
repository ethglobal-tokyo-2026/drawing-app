import { useRef, useState, type ReactNode } from "react";
import "./sheets.css";

export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const start = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  // Drag the handle down to dismiss.
  return (
    <div className="sheet" style={{ transform: dy ? `translateY(${dy}px)` : undefined }}>
      <div
        className="sheet-grip"
        onPointerDown={(e) => {
          start.current = e.clientY;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) =>
          start.current !== null && setDy(Math.max(0, e.clientY - start.current))
        }
        onPointerUp={() => {
          start.current = null;
          if (dy > 60 || dy === 0) onClose();
          setDy(0);
        }}
      >
        <span />
      </div>
      <div className="sheet-perforation" />
      {children}
    </div>
  );
}
