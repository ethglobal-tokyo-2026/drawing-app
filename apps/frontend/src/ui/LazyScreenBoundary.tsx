import { Component, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "../i18n/react";
import { ErrorLine } from "./ErrorLine";
import { LoadFailure } from "./loadFailure";
import { reloadingOntoNewBuild } from "./reloadOntoNewBuild";
import "./lazy-screen.css";

interface State {
  caught: { error: unknown } | null;
}

/**
 * Keeps the rest of the app up when a lazy screen's code doesn't load, and says so in a note with
 * Reload. Whatever else a screen throws goes on up, as it would without this.
 */
export class LazyScreenBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { caught: null };

  static getDerivedStateFromError(error: unknown): State {
    return { caught: { error } };
  }

  render() {
    const { caught } = this.state;
    if (!caught) return this.props.children;
    if (caught.error instanceof LoadFailure) return <LoadFailedNote failure={caught.error} />;
    throw caught.error;
  }
}

let notes: HTMLElement | undefined;
/** Where the notes go, above every screen and sheet; several stack. */
function notesHost(): HTMLElement {
  if (!notes) {
    notes = document.createElement("div");
    notes.className = "lazy-screen-notes";
    document.body.append(notes);
  }
  return notes;
}

/**
 * The page reloads to try again: a browser may keep a failed module fetch for the page's life, and
 * Vite never re-adds a stylesheet that failed, so loading the code again in place could fail at once,
 * or open the screen unstyled.
 */
function LoadFailedNote({ failure }: { failure: LoadFailure }) {
  const { t } = useTranslation();
  if (reloadingOntoNewBuild()) return null;
  return createPortal(
    <ErrorLine
      className="lazy-screen-note"
      detail={failure.message}
      action={{ label: t(($) => $.ui.lazyScreen.reload), onClick: () => location.reload() }}
    >
      {t(($) => $.ui.lazyScreen.didntLoad)}
    </ErrorLine>,
    notesHost(),
  );
}
