import { useLayoutEffect, useRef, useState } from "react";
import { StickerFigure } from "../src/stickers/StickerFigure";
import { useDetailLift } from "../src/sticker-board/detailLift";
import type { StickerUrls } from "../src/stickers/stickerUrls";

export function StickerLiftFixture({ urls }: { urls: StickerUrls }) {
  const origin = useRef<HTMLDivElement>(null);
  const [opened, open] = useState(false);
  const [veiled, conceal] = useState(false);
  const [shown, show] = useState("a");
  const close = useRef<() => void>(() => {});
  const [sourceResumed, resumeSource] = useState(false);
  const [source, replaceSource] = useState({ urls, style: "holo" as "holo" | "pink", side: 180 });
  const replacement = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect x="36" y="36" width="168" height="168" fill="white"/></svg>')}`;
  const foilMask = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect x="30" y="30" width="180" height="180" fill="white"/></svg>')}`;

  return (
    <>
      <button onClick={() => open(true)}>Open fixture</button>
      <button onClick={() => close.current()}>Close fixture</button>
      <button onClick={() => conceal(true)}>Conceal fixture</button>
      <button onClick={() => show("b")}>Page fixture</button>
      <button onClick={() => open(false)}>Cancel fixture</button>
      <button onClick={() => resumeSource(true)}>Resume source fixture</button>
      <button onClick={() => replaceSource({ ...source, side: 300 })}>Resize source fixture</button>
      <button
        onClick={() =>
          replaceSource({
            ...source,
            urls: { ...urls, mask: replacement, foil: foilMask },
            style: "pink",
          })
        }
      >
        Replace source fixture
      </button>
      <div
        ref={origin}
        data-lift-origin
        style={{
          position: "relative",
          width: source.side,
          height: source.side,
          marginTop: 60,
          rotate: "23deg",
        }}
      >
        <StickerFigure
          urls={source.urls}
          foilStyle={source.style}
          width={240}
          height={240}
          foil="board"
          veiled={veiled}
          laminateActive={!opened || sourceResumed}
        />
      </div>
      {opened && (
        <StickerLiftView
          origin={origin}
          shown={shown}
          urls={urls}
          onCloseReady={(finish) => {
            close.current = finish;
          }}
          onClose={() => open(false)}
        />
      )}
    </>
  );
}

function StickerLiftView({
  origin,
  shown,
  urls,
  onCloseReady,
  onClose,
}: {
  origin: React.RefObject<HTMLDivElement | null>;
  shown: string;
  urls: StickerUrls;
  onCloseReady: (close: () => void) => void;
  onClose: () => void;
}) {
  const view = useRef<HTMLDivElement>(null);
  const close = useDetailLift({
    root: view,
    shownId: shown,
    reduced: false,
    onClose,
    originOf: () => (origin.current ? { el: origin.current, turn: 23 } : null),
    into: { figureOf: (el) => el.querySelector(".sticker-figure"), enter: () => [] },
  });
  useLayoutEffect(() => onCloseReady(close), [onCloseReady, close]);
  return (
    <div
      ref={view}
      data-lift-view
      style={{ position: "absolute", left: 340, top: 200, width: 300, height: 300 }}
    >
      <StickerFigure
        key={shown}
        urls={
          new URLSearchParams(location.search).has("delayedDetail")
            ? { ...urls, foil: "/delayed-detail-foil.svg" }
            : urls
        }
        width={240}
        height={240}
        foil="detail"
      />
    </div>
  );
}
