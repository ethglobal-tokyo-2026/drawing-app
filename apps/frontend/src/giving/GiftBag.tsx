import "./giving.css";

const sealedDate = (t: number) => {
  const d = new Date(t);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};

/** A frosted gift bag, sealed with an aqua tear tape whose pull tab sticks out past its left edge. */
export function GiftBag({ url, to, sealedAt }: { url: string; to: string; sealedAt: number }) {
  return (
    <div className="gift-bag" role="img" aria-label={`A sealed gift bag for @${to}`}>
      <img className="bag-sticker" src={url} alt="" />
      <span className="bag-film" aria-hidden />
      <span className="tear-tape" aria-hidden>
        <span className="pull-tab">Pull</span>
        <span className="tape-print">Sealed {sealedDate(sealedAt)}</span>
      </span>
      <span className="bag-tag" aria-hidden>
        For @{to}
      </span>
    </div>
  );
}
