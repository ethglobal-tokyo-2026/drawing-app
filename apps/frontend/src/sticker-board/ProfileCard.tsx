import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Copy, QrCode, ShareNetwork, X } from "@phosphor-icons/react";
import { boardUrl, firstSeen } from "../identity/profile";
import { useIdentity } from "../identity/useIdentity";
import { lineLogin, lineLogout, shareOnLine } from "../line/liff";
import { formatDay } from "../stickers/format";
import "./ProfileCard.css";

interface Props {
  made: number;
  /** Newest sticker, used as the avatar. */
  avatarUrl?: string;
  onClose: () => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ProfileCard({ made, avatarUrl, onClose }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const me = useIdentity();
  const url = boardUrl();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!showQr || qr) return;
    QRCode.toString(url, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1c1b29", light: "#ffffff" },
    }).then(setQr, () => setToast("Couldn’t make a QR code"));
  }, [showQr, qr, url]);

  const share = async () => {
    const title = `@${me.handle}'s sticker board`;
    // Inside LINE: pick friends or groups to send it to.
    if (await shareOnLine(`${title}\n${url}`)) return;
    const data = { title, url };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    setToast((await copy(url)) ? "Link copied" : "Couldn’t copy the link");
  };

  return (
    <div
      className="profile-card"
      role="dialog"
      aria-label="Your profile"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="profile-head">
        <span className="avatar">
          {me.pictureUrl ? (
            <img src={me.pictureUrl} alt="" className="photo" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            <span>{me.handle[0]?.toUpperCase()}</span>
          )}
        </span>
        <div className="profile-names">
          <b>@{me.handle}</b>
          <span>{me.displayName}</span>
        </div>
        <button className="round-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {showQr ? (
        <div className="qr-view">
          {qr ? (
            <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
          ) : (
            <div className="qr loading" />
          )}
          <div className="qr-caption">{me.boardAddress}</div>
        </div>
      ) : (
        <dl className="profile-rows">
          <div>
            <dt>Board address</dt>
            <dd>
              <span className="mono">{me.boardAddress}</span>
              <button
                className="icon-only"
                aria-label="Copy board address"
                onClick={async () =>
                  setToast((await copy(me.boardAddress)) ? "Address copied" : "Couldn’t copy")
                }
              >
                <Copy size={16} />
              </button>
            </dd>
          </div>
          <div>
            <dt>Made</dt>
            <dd>
              <b>{made}</b> {made === 1 ? "sticker" : "stickers"}
            </dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd>{plural(0, "sticker")}</dd>
          </div>
          <div>
            <dt>Gratitude</dt>
            <dd className="soft">The warmth around your picture</dd>
          </div>
          <div>
            <dt>On the app since</dt>
            <dd>{formatDay(firstSeen())}</dd>
          </div>
          <div>
            <dt>LINE</dt>
            <dd>
              {me.line.status === "ready" ? (
                <>
                  <span className="line-dot" /> Connected
                  {!me.line.inClient && (
                    <button className="text-btn" onClick={lineLogout}>
                      Log out
                    </button>
                  )}
                </>
              ) : me.line.status === "logged-out" ? (
                <button className="line-login" onClick={lineLogin}>
                  Log in with LINE
                </button>
              ) : me.line.status === "loading" ? (
                <span className="soft">Connecting…</span>
              ) : me.line.status === "error" ? (
                <span className="soft">Unavailable ({me.line.message})</span>
              ) : (
                <span className="soft">Not configured</span>
              )}
            </dd>
          </div>
        </dl>
      )}

      <div className="profile-actions">
        <button className="share-btn" onClick={share}>
          <ShareNetwork size={18} /> Share my board
        </button>
        <button className="qr-btn" onClick={() => setShowQr((v) => !v)} aria-pressed={showQr}>
          <QrCode size={18} /> {showQr ? "Details" : "QR code"}
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
