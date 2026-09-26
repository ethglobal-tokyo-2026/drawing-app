import { useEffect, useState, type ReactNode } from "react";
import { deviceGiftStore } from "../giving/giftStore";
import { useIdentity, type Identity } from "../identity/useIdentity";
import { readSeen, saveSeen } from "../sticker-board/tray/traySeen";
import { listStickers, updatePlacement, type StickerRecord } from "../stickers/stickerStorage";
import { stickerUrls, type StickerUrls } from "../stickers/stickerUrls";
import type { ApiClient } from "./apiClient";
import { ApiProvider } from "./ApiProvider";
import type { Person } from "./contract";
import { createDeviceApi } from "./deviceApi";

/** On the dev server the mock answers, unless `VITE_API_MOCK=off`. The build never loads it. */
const MOCKED = import.meta.env.DEV && import.meta.env.VITE_API_MOCK !== "off";

const toMe = (identity: Identity): Person => ({
  id: "me",
  handle: identity.handle,
  lineDisplayName: identity.displayName,
  linePictureUrl: identity.pictureUrl ?? null,
});

/** A sticker's images never change once it's sealed, so each gets its object URLs once. */
function keptUrls() {
  const kept = new Map<string, StickerUrls>();
  return (record: StickerRecord) => {
    let urls = kept.get(record.id);
    if (!urls) {
      urls = stickerUrls(record);
      kept.set(record.id, urls);
    }
    return urls;
  };
}

/** The app's API client, for everything inside LineGate. */
export function ApiRoot({ children }: { children: ReactNode }) {
  const identity = useIdentity();
  // LINE's profile is settled before LineGate renders the app, and a new login reloads the page.
  const [device] = useState(() => {
    const me = toMe(identity);
    return createDeviceApi({
      me: () => me,
      listStickers,
      updatePlacement,
      gifts: () => deviceGiftStore().snapshot(),
      readSeen,
      saveSeen,
      urlsOf: keptUrls(),
    });
  });
  const [client, setClient] = useState<ApiClient | null>(MOCKED ? null : device);

  useEffect(() => {
    if (!MOCKED) return;
    let current = true;
    import("./mock").then(
      ({ createMockApi }) => {
        if (current) setClient(createMockApi({ base: device }));
      },
      (error: unknown) => {
        console.error(
          "The dev server's API mock didn't load, so this device's data answers",
          error,
        );
        if (current) setClient(device);
      },
    );
    return () => {
      current = false;
    };
  }, [device]);

  return client ? <ApiProvider client={client}>{children}</ApiProvider> : null;
}
