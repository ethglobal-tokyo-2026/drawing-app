import { Component, type ReactNode } from "react";
import { useTranslation } from "../i18n/react";
import { GateNotice } from "../line/GateParts";
import { Key } from "../ui/Key";
import "../line/LineGate.css";

interface State {
  crashed: { error: unknown } | null;
}

/**
 * Catches what a screen throws as it renders, which would otherwise unmount the whole app and leave a
 * blank page, and puts a page saying so in its place, with the error's words and Reload. React itself
 * reports what this catches to the console.
 */
export class AppCrashBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { crashed: null };

  static getDerivedStateFromError(error: unknown): State {
    return { crashed: { error } };
  }

  render() {
    const { crashed } = this.state;
    return crashed ? <AppCrashed error={crashed.error} /> : this.props.children;
  }
}

function AppCrashed({ error }: { error: unknown }) {
  const { t } = useTranslation();
  return (
    <main className="line-gate">
      <GateNotice
        title={t(($) => $.app.crash.title)}
        lead={t(($) => $.app.crash.lead)}
        detail={String(error)}
      >
        <Key onClick={() => location.reload()}>{t(($) => $.app.crash.reload)}</Key>
      </GateNotice>
    </main>
  );
}
