import { At } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { Key } from "../ui/Key";
import { apiError, type ApiError } from "./apiClient";
import type { Me } from "@drawing-app/api/client";
import "../line/LineGate.css";
import "./HandlePrompt.css";

/** The server's longest handle, in code points; it checks too, answering handle_invalid. */
const HANDLE_MAX_LENGTH = 32;

interface Props {
  me: Me;
  setHandle: (handle: string) => Promise<{ me: Me }>;
  onChosen: (me: Me) => void;
}

/** What went wrong, in words: a taken or broken handle, or the server's own answer. */
function problemOf(error: ApiError, handle: string): string {
  if (error.code === "handle_taken") return `@${handle} is taken. Try another.`;
  if (error.code === "handle_invalid") {
    return `A handle is 1 to ${HANDLE_MAX_LENGTH} characters, without “@”.`;
  }
  return `Couldn’t save your handle: ${error.message}`;
}

/** Asks for a handle when your LINE name is already someone's, before the app opens. */
export function HandlePrompt({ me, setHandle, onChosen }: Props) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const handle = draft.trim().replace(/^@/, "");
  const tooLong = Array.from(handle).length > HANDLE_MAX_LENGTH;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!handle || tooLong || saving) return;
    setSaving(true);
    setProblem(null);
    try {
      onChosen((await setHandle(handle)).me);
    } catch (error) {
      const failure = apiError(error);
      console.error(`Saving the handle @${handle} failed`, failure);
      setProblem(problemOf(failure, handle));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="line-gate handle-prompt">
      <h1 className="title-label">Pick your handle</h1>
      <p className="line-gate__lead">
        {me.lineDisplayName &&
          `Someone already goes by @${me.lineDisplayName}, so choose your own. `}
        It’s how people find you and your stickers.
      </p>
      <form className="handle-prompt__form" onSubmit={(e) => void submit(e)}>
        <label className="handle-prompt__field">
          <At size={20} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="handle"
            aria-label="Your handle"
            aria-invalid={Boolean(problem) || tooLong}
            aria-describedby="handle-prompt-problem"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
        </label>
        <p id="handle-prompt-problem" className="handle-prompt__problem" role="alert">
          {tooLong ? `That’s over ${HANDLE_MAX_LENGTH} characters.` : problem}
        </p>
        <Key type="submit" tone="pink" disabled={!handle || tooLong || saving}>
          {handle ? `Use @${handle}` : "Pick a handle"}
        </Key>
      </form>
    </main>
  );
}
