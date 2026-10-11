import { Fragment, useLayoutEffect, useRef } from "react";
import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { useTranslation } from "../i18n/react";
import "./corner-print.css";

/** Full localized subjects in the lower margin; the canvas name also supplies the complete pair. */
export function CornerPrint({
  subjects,
}: {
  subjects: readonly [KyotoSeikaSubject, KyotoSeikaSubject];
}) {
  const { i18n, t } = useTranslation();
  const japanese = i18n.resolvedLanguage === "ja";
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const print = root.current;
    const pair = print?.querySelector<HTMLElement>(".corner-print__pair");
    if (!print || !pair) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      print.classList.remove("is-long");
      const width = print.getBoundingClientRect().width;
      if (pair.getBoundingClientRect().height > 46 || pair.scrollWidth > width + 1)
        print.classList.add("is-long");
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(print.parentElement ?? print);
    window.addEventListener("resize", measure);
    document.fonts?.addEventListener("loadingdone", measure);
    // Font readiness may settle after this sheet has gone away.
    void document.fonts?.ready.then(measure);
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, [subjects, japanese]);
  return (
    <div ref={root} className="corner-print" aria-hidden="true" lang={japanese ? "ja" : "en"}>
      <span className="corner-print__pair">
        {subjects.map((subject, index) => (
          <Fragment key={subject.ja}>
            {index > 0 && " "}
            <span className="corner-print__word">
              {index > 0 && `${t(($) => $.kyotoSeika.print.joiner)} `}
              {japanese ? subject.ja : subject.en}
            </span>
          </Fragment>
        ))}
      </span>
    </div>
  );
}
