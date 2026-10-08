import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { SubjectWord } from "./SubjectWord";
import "./subject-pair.css";

/**
 * The pair a sticker drawn in Kyoto Seika Practice Mode was dealt, 「風 × 再会」, each word with its
 * reading. Hidden from screen readers: the line it sits in says the pair with `spokenSubject`.
 */
export function SubjectPair({
  subjects: [first, second],
}: {
  subjects: readonly [KyotoSeikaSubject, KyotoSeikaSubject];
}) {
  return (
    <span className="subject-pair" lang="ja" aria-hidden="true">
      <SubjectWord subject={first} />
      <i>{"×"}</i>
      <SubjectWord subject={second} />
    </span>
  );
}
