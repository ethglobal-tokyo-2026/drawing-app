import { useTranslation } from "../i18n/react";
import { openLinkInLine } from "../line/openLink";
import { ensAppUrl } from "./explorers";

/** A name under croquis.eth, which opens in the ENS app with its records. */
export function EnsNameLink({ name, className }: { name: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <a
      className={className}
      href={ensAppUrl(name)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t(($) => $.stickerBoard.ensName.open, { name })}
      onClick={openLinkInLine}
    >
      {name}
    </a>
  );
}
