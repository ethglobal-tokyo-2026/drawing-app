/** The build this tab last reloaded away from. */
const RELOADED_FROM = "draw.reloadedFrom";
let reloading = false;

/**
 * A deploy deletes the old build's chunks, so a page still on it reloads onto the new build before
 * opening what it hadn't loaded. Once per build in a tab: still on the build it reloaded away from,
 * the page has a broken build or a bad connection that reloading again wouldn't fix, and the screen
 * that didn't load says so instead. WebKit words every failed import alike, so the build is the key,
 * not the error.
 */
export function reloadOntoNewBuild(preloadError: Event, build: string): void {
  if (sessionStorage.getItem(RELOADED_FROM) === build) return;
  sessionStorage.setItem(RELOADED_FROM, build);
  reloading = true;
  preloadError.preventDefault();
  location.reload();
}

/** The page is on its way to the new build, so what didn't load needn't say so. */
export const reloadingOntoNewBuild = () => reloading;
