import {
  chromium,
  webkit,
} from "../../../../apps/frontend/node_modules/@playwright/test/index.mjs";

// Isolated blank local-origin pages; no app server or user data.
for (const [browserName, browserType] of [
  ["chromium", chromium],
  ["webkit", webkit],
] as const) {
  const browser = await browserType.launch({ headless: true, timeout: 10_000 });
  try {
    const page = await browser.newPage();
    await page.route("http://localhost:19285/**", (route) =>
      route.fulfill({
        body: "<!doctype html><title>Local lock review</title>",
        contentType: "text/html",
      }),
    );
    await page.goto("http://localhost:19285/");
    for (const steal of [true, false]) {
      const result = await page.evaluate(async (steal) => {
        let releaseOld!: () => void;
        let releaseNew!: () => void;
        let grantedOld!: () => void;
        const oldHeld = new Promise<void>((resolve) => {
          releaseOld = resolve;
        });
        const newHeld = new Promise<void>((resolve) => {
          releaseNew = resolve;
        });
        const oldGranted = new Promise<void>((resolve) => {
          grantedOld = resolve;
        });
        let oldRejected = "";
        let newGranted = false;
        const oldRequest = navigator.locks
          .request("creation-test-native-lock", { steal: true }, () => {
            grantedOld();
            return oldHeld;
          })
          .catch((error) => {
            oldRejected = error.name;
          });
        await oldGranted;
        const newRequest = navigator.locks.request("creation-test-native-lock", { steal }, () => {
          newGranted = true;
          return newHeld;
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
        const beforeRelease = { oldRejected, newGranted };
        releaseOld();
        await oldRequest;
        releaseNew();
        await newRequest;
        return beforeRelease;
      }, steal);
      console.log(JSON.stringify({ browser: browserName, steal, ...result }));
    }
  } finally {
    await browser.close();
  }
}
