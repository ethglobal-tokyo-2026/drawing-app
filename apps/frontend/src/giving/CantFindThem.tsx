import liff from "@line/liff";
import { ArrowSquareOut, CaretLeft, CaretRight } from "../icons";
import { useState } from "react";
import { useTranslation } from "../i18n/react";
import { describeLiffError } from "../line/liff";
import { ErrorLine } from "../ui/ErrorLine";

/** LINE's Add friends screen. LINE opens it on phones only. */
const ADD_FRIENDS_URL = "https://line.me/R/nv/addFriends";

/** "Can’t find them?"'s header, the sheet's head: its back button and its title. */
export function CantFindThemHead({
  onBack,
  className,
}: {
  onBack: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <header className={["giving__head", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className="giving__icon-btn giving__icon-btn--back"
        onClick={onBack}
        aria-label={t(($) => $.giving.cantFind.back)}
      >
        <CaretLeft size={20} />
      </button>
      <h2 className="giving__title">{t(($) => $.giving.cantFind.title)}</h2>
    </header>
  );
}

/** "Can’t find them?", in Not sent yet's place: for a friend LINE's picker leaves out. */
export function CantFindThem() {
  const { t } = useTranslation();
  /** LINE's own words for why its Add friends screen didn't open. */
  const [reason, setReason] = useState<string | null>(null);

  const addFriends = () => {
    setReason(null);
    try {
      liff.openWindow({ url: ADD_FRIENDS_URL, external: true });
    } catch (error) {
      console.error("LINE’s Add friends screen didn’t open", error);
      setReason(describeLiffError(error));
    }
  };

  return (
    <>
      <p className="giving__sub keep-phrases">{t(($) => $.giving.cantFind.lead)}</p>
      <div className="giving__rows">
        <button
          type="button"
          className="giving__row"
          data-press
          data-autofocus
          onClick={addFriends}
        >
          <span className="giving__row-icon">
            <ArrowSquareOut size={20} />
          </span>
          <span className="giving__row-text">
            <b>{t(($) => $.giving.cantFind.notFriends)}</b>
            <small>{t(($) => $.giving.cantFind.notFriendsHint)}</small>
          </span>
          <CaretRight className="giving__row-chev" size={20} />
        </button>
      </div>
      {reason !== null && (
        <ErrorLine className="giving__problem" detail={reason}>
          {t(($) => $.giving.cantFind.addFriendsDidntOpen)}
        </ErrorLine>
      )}
    </>
  );
}
