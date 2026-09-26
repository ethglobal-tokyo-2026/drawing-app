/**
 * The gzipped timelapse's largest size, as sent. Its own module, free of server imports, so the
 * app can read it through the typed client and seal without a timelapse that's over it.
 */
export const MAX_TIMELAPSE_BYTES = 2 * 1024 * 1024;
