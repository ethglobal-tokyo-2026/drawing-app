import { useEffect, useRef, useState } from "react";
import { boardUrl } from "../../identity/profile";
import { useIdentity } from "../../identity/useIdentity";
import { Sheet } from "../../ui/Sheet";
import { boardTitle } from "./shareBoard";
import "./board-qr-sheet.css";

type Code = { url: string } & (
  | { state: "ready"; svg: string }
  | { state: "failed"; reason: string }
);

interface Props {
  open: boolean;
  onClose: () => void;
}

// Loaded when the sheet first opens, so the QR library stays out of the app's first download.
async function makeCode(url: string): Promise<string> {
  const { default: QRCode } = await import("qrcode");
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1c1b29", light: "#ffffff" },
  });
}

/** The board's link as a QR code, for someone beside you to scan. */
export function BoardQrSheet({ open, onClose }: Props) {
  const me = useIdentity();
  const url = boardUrl(me.handle);
  const [code, setCode] = useState<Code | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    // Each opening tries again after a failure.
    if (open && code?.state === "failed") setCode(null);
  }
  const wanted = open && code?.url !== url;
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wanted) return;
    let current = true;
    makeCode(url).then(
      (svg) => {
        if (current) setCode({ url, state: "ready", svg });
      },
      (error: unknown) => {
        console.error("Couldn't make the board's QR code", error);
        const reason = error instanceof Error ? error.message : String(error);
        if (current) setCode({ url, state: "failed", reason });
      },
    );
    return () => {
      current = false;
    };
  }, [wanted, url]);

  // Focus moves into the sheet as it opens, and back to where it was when it closes.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    body.current?.focus();
    return () => previous?.focus();
  }, [open]);

  const shown = code?.url === url ? code : null;
  return (
    <>
      {open && <div className="board-qr__scrim" onClick={onClose} />}
      <Sheet label="QR code" open={open} onClose={onClose}>
        <div className="board-qr" ref={body} tabIndex={-1}>
          <h2 className="board-qr__title">QR code</h2>
          {shown?.state === "ready" ? (
            <img
              className="board-qr__code"
              src={`data:image/svg+xml,${encodeURIComponent(shown.svg)}`}
              alt="QR code of your sticker board’s link"
              draggable={false}
            />
          ) : (
            <div className="board-qr__code is-empty" role="status">
              {shown?.state === "failed" && (
                <p className="board-qr__failed">Couldn’t make a QR code: {shown.reason}</p>
              )}
            </div>
          )}
          <p className="fine board-qr__caption">{boardTitle(me.handle)}</p>
        </div>
      </Sheet>
    </>
  );
}
