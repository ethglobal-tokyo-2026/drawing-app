// @vitest-environment happy-dom
import { act, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useModalDialog } from "./useModalDialog";

/** A layer of its own, a scrim and a sheet, the way Giving lays it out. */
function Layer({ active = true }: { active?: boolean }) {
  const layer = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  useModalDialog(body, { layer, active });
  return (
    <div ref={layer}>
      <div id="scrim" />
      <div role="dialog" id="sheet">
        <div ref={body} />
      </div>
    </div>
  );
}

/** A dialog with no layer around it: its own controls beside its body stay live. */
function Bare() {
  const body = useRef<HTMLDivElement>(null);
  useModalDialog(body);
  return (
    <div role="dialog" id="bare">
      <button id="grab" />
      <div ref={body} />
    </div>
  );
}

let page: HTMLDivElement;
let root: Root;

const render = (ui: ReactNode) => act(() => root.render(ui));
const part = (id: string) => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`no #${id}`);
  return found;
};

/** The app behind the layer, and where the layer mounts, side by side as the phone has them. */
beforeEach(() => {
  page = document.createElement("div");
  const app = document.createElement("main");
  app.id = "app";
  const tabs = document.createElement("nav");
  tabs.id = "tabs";
  const layerHost = document.createElement("div");
  page.append(app, tabs, layerHost);
  document.body.append(page);
  root = createRoot(layerHost);
});

afterEach(() => {
  act(() => root.unmount());
  page.remove();
});

describe("useModalDialog", () => {
  it("marks the dialog modal and leaves the layer's own parts live, with the rest of the page inert", () => {
    render(<Layer />);
    expect(part("sheet").getAttribute("aria-modal")).toBe("true");
    expect(part("app").inert).toBe(true);
    expect(part("tabs").inert).toBe(true);
    expect(part("scrim").inert).toBe(false);
    expect(part("sheet").inert).toBe(false);
  });

  it("keeps a lone dialog's own controls live while the page behind it is inert", () => {
    render(<Bare />);
    expect(part("bare").getAttribute("aria-modal")).toBe("true");
    expect(part("grab").inert).toBe(false);
    expect(part("app").inert).toBe(true);
  });

  it("gives the page back when the dialog goes", () => {
    render(<Layer />);
    render(<Layer active={false} />);
    expect(part("app").inert).toBe(false);
    expect(part("sheet").hasAttribute("aria-modal")).toBe(false);
  });

  it("leaves inert what was inert before the dialog came", () => {
    part("app").inert = true;
    render(<Layer />);
    render(<Layer active={false} />);
    expect(part("app").inert).toBe(true);
  });

  it("hands back what the page's owner asked for while the dialog was up, and holds it until then", async () => {
    render(<Layer />);
    // While the sheet is open the tab strip's owner shows it, then tucks it away again.
    await act(async () => void (part("tabs").inert = false));
    expect(part("tabs").inert).toBe(true);
    await act(async () => part("tabs").setAttribute("inert", ""));
    render(<Layer active={false} />);
    expect(part("tabs").inert).toBe(true);
  });

  it("gives back a part its owner let go of while the dialog was up", async () => {
    part("tabs").inert = true;
    render(<Layer />);
    await act(async () => void (part("tabs").inert = false));
    render(<Layer active={false} />);
    expect(part("tabs").inert).toBe(false);
  });
});
