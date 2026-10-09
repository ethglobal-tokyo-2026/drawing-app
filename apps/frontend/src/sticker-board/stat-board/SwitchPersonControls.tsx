import { takeMockGiftMessage } from "../../giving/mockGiftMessages";
import { useTranslation } from "../../i18n/react";
import { liffMockActive, mockPerson } from "../../line/liff";
import { LabelButton } from "../../ui/LabelButton";
import "./switch-person-controls.css";

/** The demo's people, as `?as=` names: VITE_DEMO_PEOPLE, comma-separated. */
const demoPeople = () => [
  ...new Set(
    (import.meta.env.VITE_DEMO_PEOPLE ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  ),
];

/**
 * Switches the demo between its people, on the developer slip. Under LIFF Mock, `?as=` signs the tab
 * in as that person, so switching reloads the app as them, with their board fresh from the server.
 */
export function SwitchPersonControls() {
  const { t } = useTranslation();
  const people = demoPeople();
  if (!liffMockActive || people.length < 2) return null;
  const current = mockPerson("", sessionStorage).sub.replace(/^dev-/, "");
  return (
    <div className="switch-person">
      <h3 className="fine switch-person__h">
        {t(($) => $.stickerBoard.developer.demoPeople.title)}
      </h3>
      {people
        .filter((name) => name !== current)
        .map((name) => (
          <LabelButton
            key={name}
            block
            tone="aqua"
            onClick={() => {
              // A Gift Message sent meanwhile opens as them, as its link would from their LINE chat.
              const giftPath = takeMockGiftMessage();
              location.assign(`${giftPath ?? "/"}?as=${encodeURIComponent(name)}`);
            }}
          >
            {t(($) => $.stickerBoard.developer.demoPeople.switchTo, {
              name: name.charAt(0).toUpperCase() + name.slice(1),
            })}
          </LabelButton>
        ))}
    </div>
  );
}
