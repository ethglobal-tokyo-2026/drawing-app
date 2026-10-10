/**
 * The longest performance report the server takes, in characters, and the longest device
 * description. Its own module, free of server imports, so the app can fit its report to it. The report
 * stays under journald's 48K line limit, which would split its log line, and the 64 KiB a keepalive
 * request may carry.
 */
export const MAX_PERFORMANCE_REPORT_CHARS = 32_000;
export const MAX_PERFORMANCE_DEVICE_CHARS = 2_000;
