export const formatNo = (no: number) => `No.${String(no).padStart(4, "0")}`;
/** A handle as it's printed: one "@", however many it came with. */
export const formatHandle = (handle: string) => `@${handle.replace(/^@+/, "")}`;
export const formatClock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
export const formatDay = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};
