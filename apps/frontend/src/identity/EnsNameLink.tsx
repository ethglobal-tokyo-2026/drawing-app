import type { ReactNode } from "react";
import { useTranslation } from "../i18n/react";
import { openLinkInLine } from "../line/openLink";
import { ensAppUrl } from "./explorers";

interface Props {
  name: string;
  className?: string;
  /** What the link shows: the name, unless it's printed on something of its own. */
  children?: ReactNode;
}

/** A name under croquis.eth, which opens in the ENS app with its records. */
export function EnsNameLink({ name, className, children = name }: Props) {
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
      {children}
    </a>
  );
}
