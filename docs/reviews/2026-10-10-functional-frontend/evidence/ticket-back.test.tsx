import { act } from "react";
import { expect, it, vi } from "vitest";
import { emptyApi, FRESH_TICKETS, renderWithApi } from "../../../../apps/frontend/src/api/testing";
import { OutOfTickets } from "../../../../apps/frontend/src/tickets/OutOfTickets";

it("records the out-of-tickets card ignoring browser Back", () => {
  const onBoard = vi.fn();
  const push = vi.spyOn(history, "pushState");
  const view = renderWithApi(
    <OutOfTickets
      tickets={{ ...FRESH_TICKETS, dailyLeft: 0, reserveLeft: 0 }}
      onShop={() => {}}
      onStartDrawing={() => {}}
      onBoard={onBoard}
      overBoard
    />,
    emptyApi(),
  );
  expect(view.host.querySelector('[role="dialog"]')).not.toBeNull();
  expect(push).not.toHaveBeenCalled();
  act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: null })));
  expect(onBoard).not.toHaveBeenCalled();
  view.unmount();
  vi.restoreAllMocks();
});
