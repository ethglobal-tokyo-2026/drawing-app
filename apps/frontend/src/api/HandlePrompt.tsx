import type { TFunction } from "i18next";
import { useState, type FormEvent } from "react";
import { errorReason } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { At } from "../icons";
import { Key } from "../ui/Key";
import { apiError, type ApiError } from "./apiClient";
import { HANDLE_MAX_LENGTH, type Me } from "@drawing-app/api/client";
import "../line/LineGate.css";
import "./HandlePrompt.css";

interface Props {
  me: Me;
  setHandle: (handle: string) => Promise<{ me: Me }>;
  onChosen: (me: Me) => void;
}

/** A failed save, kept as its error so the words follow the app's language. */
interface FailedSave {
  handle: string;
  error: ApiError;
}

/** What went wrong, in words: a taken or broken handle, or the server's own answer. */
function problemOf({ handle, error }: FailedSave, t: TFunction): string {
  if (error.code === "handle_taken") return t(($) => $.api.handle.taken, { handle });
  if (error.code === "handle_invalid") {
    return t(($) => $.api.handle.invalid, { max: HANDLE_MAX_LENGTH });
  }
  return t(($) => $.api.handle.couldntSave, { reason: errorReason(error) });
}

/** Asks for a handle when your LINE name couldn't become one, before the app opens. */
export function HandlePrompt({ me, setHandle, onChosen }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [failedSave, setFailedSave] = useState<FailedSave | null>(null);
  const handle = draft.trim().replace(/^@/, "");
  const tooLong = Array.from(handle).length > HANDLE_MAX_LENGTH;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!handle || tooLong || saving) return;
    setSaving(true);
    setFailedSave(null);
    try {
      onChosen((await setHandle(handle)).me);
    } catch (error) {
      const failure = apiError(error);
      console.error(`Saving the handle @${handle} failed`, failure);
      setFailedSave({ handle, error: failure });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="line-gate handle-prompt">
      <h1 className="title-label">{t(($) => $.api.handle.title)}</h1>
      <p className="line-gate__lead">
        {me.lineDisplayName
          ? t(($) => $.api.handle.leadNameUnavailable, { name: me.lineDisplayName })
          : t(($) => $.api.handle.lead)}
      </p>
      <form className="handle-prompt__form" onSubmit={(e) => void submit(e)}>
        <label className="handle-prompt__field">
          <At size={20} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t(($) => $.api.handle.placeholder)}
            aria-label={t(($) => $.api.handle.field)}
            aria-invalid={Boolean(failedSave) || tooLong}
            aria-describedby="handle-prompt-problem"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
        </label>
        <p id="handle-prompt-problem" className="handle-prompt__problem" role="alert">
          {tooLong
            ? t(($) => $.api.handle.tooLong, { max: HANDLE_MAX_LENGTH })
            : failedSave && problemOf(failedSave, t)}
        </p>
        {/* While saving it keeps its face (aria-busy, never disabled) and submit() takes no second try. */}
        <Key
          type="submit"
          tone="pink"
          className="handle-prompt__key"
          disabled={!handle || tooLong}
          aria-busy={saving || undefined}
          aria-disabled={saving || undefined}
        >
          <span className="handle-prompt__use">
            {handle ? t(($) => $.api.handle.use, { handle }) : t(($) => $.api.handle.pick)}
          </span>
        </Key>
      </form>
    </main>
  );
}
