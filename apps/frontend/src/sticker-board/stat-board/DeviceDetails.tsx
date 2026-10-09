import { useLayoutEffect, useState } from "react";
import { useTranslation } from "../../i18n/react";
import { AccountRow } from "../../identity/AccountRow";
import { Copy } from "../../icons";
import {
  deviceFactRows,
  formatDeviceDetails,
  readDeviceFacts,
  watchDeviceFacts,
  type DeviceFacts,
} from "../../performance/deviceFacts";
import { ErrorLine } from "../../ui/ErrorLine";
import { LabelButton } from "../../ui/LabelButton";
import { useLargeScreen } from "../../ui/largeScreen";
import "./device-details.css";

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The developer slip's Device paper: what the device and its browser say about themselves and
 * whether the app takes the large layout, following every turn and resize, with Copy for a report
 * from a real iPad.
 */
export function DeviceDetails() {
  const { t } = useTranslation();
  const large = useLargeScreen();
  const [facts, setFacts] = useState<DeviceFacts | null>(null);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** The details, to copy by hand after the clipboard refused them. */
  const [uncopied, setUncopied] = useState<string | null>(null);

  // Read before the first paint, then again whenever a turn, a resize, a zoom or a pointing device
  // may have changed them.
  useLayoutEffect(() => {
    const read = () => setFacts(readDeviceFacts());
    read();
    return watchDeviceFacts(read);
  }, []);
  if (!facts) return null;

  const copy = async () => {
    const text = formatDeviceDetails(facts, large, new Date());
    setCopied(false);
    setProblem(null);
    setUncopied(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (error) {
      console.error("The device details couldn't be copied", error);
      setProblem(t(($) => $.stickerBoard.developer.device.notCopied, { reason: reason(error) }));
      setUncopied(text);
    }
  };

  return (
    <div className="device-details">
      <h3 className="fine device-details__h">{t(($) => $.stickerBoard.developer.device.title)}</h3>
      <dl className="account-rows">
        {deviceFactRows(facts, large).map(([label, value]) => (
          <AccountRow key={label} label={label} value={value} />
        ))}
      </dl>
      {/* The clipboard wants the tap's own click, which the press would fire late. */}
      <LabelButton size="sm" icon={<Copy />} data-press="off" onClick={() => void copy()}>
        {t(($) => $.stickerBoard.developer.device.copy)}
      </LabelButton>
      <p className="fine device-details__note" role="status">
        {copied ? t(($) => $.stickerBoard.developer.device.copied) : ""}
      </p>
      {problem && <ErrorLine>{problem}</ErrorLine>}
      {uncopied && (
        <textarea
          className="device-details__text"
          aria-label={t(($) => $.stickerBoard.developer.device.text)}
          readOnly
          value={uncopied}
        />
      )}
    </div>
  );
}
