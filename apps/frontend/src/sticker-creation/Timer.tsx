export function Timer({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const state = seconds === 0 ? "done" : seconds <= 30 ? "low" : "";
  return (
    <div className={`timer ${state}`} role="timer" aria-label={`${m} minutes ${s} seconds left`}>
      {m}:{String(s).padStart(2, "0")}
    </div>
  );
}
