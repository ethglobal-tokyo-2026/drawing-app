/**
 * A handle's longest length, in code points. Its own module, free of server imports, so the app
 * can read it through the typed client and say a handle is too long before sending it.
 */
export const HANDLE_MAX_LENGTH = 32;
