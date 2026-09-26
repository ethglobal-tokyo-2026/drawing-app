import liff from "@line/liff";
import { ArrowSquareOut, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "../i18n/react";
import { describeLiffError } from "../line/liff";

/** LINE's Add friends screen. LINE opens it on phones only. */
const ADD_FRIENDS_URL = "https://line.me/R/nv/addFriends";

interface Props {
  onBack: () => void;
}

/** "Can’t find them?", in the give sheet's place: for a friend LINE's picker leaves out. */
export function CantFindThem({ onBack }: Props) {
  const { t } = useTranslation();
  /** Why LINE's Add friends screen didn't open. */
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
      <header className="giving__head">
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
      <p className="giving__sub">{t(($) => $.giving.cantFind.lead)}</p>
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
        <p className="giving__problem" role="alert">
          {t(($) => $.giving.cantFind.addFriendsDidntOpen, { reason })}
        </p>
      )}
    </>
  );
}
