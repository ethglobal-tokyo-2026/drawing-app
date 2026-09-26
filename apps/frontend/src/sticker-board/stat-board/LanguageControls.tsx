import { useState } from "react";
import { currentLanguage } from "../../i18n/i18n";
import { keepChosenLanguage, readChosenLanguage, type Language } from "../../i18n/language";
import { useTranslation } from "../../i18n/react";
import "./language-controls.css";

type Choice = Language | "line";

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The app's language, on the stat board's developer slip: LINE's, or English or Japanese to test with.
 * A choice restarts the app, so text that code outside React built at load follows it too.
 */
export function LanguageControls({ restart = () => location.reload() }: { restart?: () => void }) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState<Choice>(() => readChosenLanguage() ?? "line");
  const [problem, setProblem] = useState<string | null>(null);

  const choose = (choice: Choice) => {
    try {
      keepChosenLanguage(choice === "line" ? null : choice);
    } catch (error) {
      console.error("The chosen language couldn't be kept", error);
      setProblem(t(($) => $.stickerBoard.developer.language.notKept, { reason: reason(error) }));
      return;
    }
    setChosen(choice);
    restart();
  };

  const options: { choice: Choice; label: string }[] = [
    { choice: "line", label: t(($) => $.stickerBoard.developer.language.line) },
    { choice: "en", label: t(($) => $.stickerBoard.developer.language.english) },
    { choice: "ja", label: t(($) => $.stickerBoard.developer.language.japanese) },
  ];
  return (
    <fieldset className="language-controls">
      <legend className="fine">
        {t(($) => $.stickerBoard.developer.language.title, { language: currentLanguage() })}
      </legend>
      {options.map(({ choice, label }) => (
        <label key={choice}>
          <input
            type="radio"
            name="app-language"
            checked={chosen === choice}
            onChange={() => choose(choice)}
          />
          {label}
        </label>
      ))}
      {problem && (
        <p className="fine language-controls__problem" role="alert">
          {problem}
        </p>
      )}
    </fieldset>
  );
}
