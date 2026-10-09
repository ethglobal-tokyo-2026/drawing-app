// Clear of `pnpm dev`'s 5173 and 8788, so the suite runs beside it. E2E_APP_PORT and E2E_API_PORT move
// a run to other ports, so two worktrees can run the suite at once.
export const E2E_APP_PORT = Number(process.env.E2E_APP_PORT ?? 5199);
export const E2E_API_PORT = Number(process.env.E2E_API_PORT ?? 8799);
