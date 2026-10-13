import { takeMockGiftMessage } from "../../giving/mockGiftMessages";
import { useContext } from "react";
import { SessionEnvelopeContext } from "../../api/sessionContext";
import { usePersonSwitch } from "../../api/PersonSwitchProvider";
import { useTranslation } from "../../i18n/react";
import { liffMockActive, mockPerson } from "../../line/liff";
import { LabelButton } from "../../ui/LabelButton";
import "./developer-slip.css";

/** Server capability controls remain visible when the optional developer tools are hidden. */
export function LivePersonSwitchControls() {
  const session = useContext(SessionEnvelopeContext);
  const { pending, request } = usePersonSwitch();
  const { t } = useTranslation();
  if (!session || session.personSwitchMode === "off" || session.allowedSelections.length < 2)
    return null;
  return (
    <section className="stat-board__note">
      <div className="stat-board__paper dev-slip__section">
        <h3 className="fine dev-slip__h">{t(($) => $.personSwitch.title)}</h3>
        {session.allowedSelections
          .filter((person) => person.id !== session.me.id)
          .map((person) => (
            <LabelButton
              key={person.id}
              block
              disabled={pending}
              onClick={() => void request(person.id)}
            >
              {t(($) => $.personSwitch.switchTo, { name: person.lineDisplayName })}
            </LabelButton>
          ))}
      </div>
    </section>
  );
}

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
    <div className="dev-slip__section">
      <h3 className="fine dev-slip__h">{t(($) => $.stickerBoard.developer.demoPeople.title)}</h3>
      {people
        .filter((name) => name !== current)
        .map((name) => (
          <LabelButton
            key={name}
            block
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
