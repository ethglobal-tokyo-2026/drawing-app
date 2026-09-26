import liff from "@line/liff";
import { ArrowSquareOut, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useState } from "react";
import { describeLiffError } from "../line/liff";

/** LINE's Add friends screen. LINE opens it on phones only. */
const ADD_FRIENDS_URL = "https://line.me/R/nv/addFriends";

interface Props {
  onBack: () => void;
}

/** "Can’t find them?", in the give sheet's place: for a friend LINE's picker leaves out. */
export function CantFindThem({ onBack }: Props) {
  const [problem, setProblem] = useState<string | null>(null);

  const addFriends = () => {
    setProblem(null);
    try {
      liff.openWindow({ url: ADD_FRIENDS_URL, external: true });
    } catch (error) {
      console.error("LINE’s Add friends screen didn’t open", error);
      setProblem(`LINE’s Add friends screen didn’t open: ${describeLiffError(error)}`);
    }
  };

  return (
    <>
      <header className="giving__head">
        <button
          type="button"
          className="giving__icon-btn giving__icon-btn--back"
          onClick={onBack}
          aria-label="Back"
        >
          <CaretLeft size={20} />
        </button>
        <h2 className="giving__title">Can’t find them?</h2>
      </header>
      <p className="giving__sub">
        LINE’s list leaves out anyone who turned off sharing with apps, and friends you added in the
        last few minutes.
      </p>
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
            <b>Not friends in LINE yet?</b>
            <small>Add them in LINE first and say hi. Then come back and pick them.</small>
          </span>
          <CaretRight className="giving__row-chev" size={20} />
        </button>
      </div>
      {problem && (
        <p className="giving__problem" role="alert">
          {problem}
        </p>
      )}
    </>
  );
}
