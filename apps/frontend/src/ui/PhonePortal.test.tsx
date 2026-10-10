// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PhonePortal } from "./PhonePortal";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.body.appendChild(document.createElement("div"));
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.replaceChildren();
});

const addPhone = () => {
  const phone = document.body.appendChild(document.createElement("div"));
  phone.className = "phone";
  return phone;
};
const render = (eachRender: boolean, label: string) =>
  act(() =>
    root.render(
      <PhonePortal eachRender={eachRender}>
        <p className="over">{label}</p>
      </PhonePortal>,
    ),
  );
const over = () => document.querySelector(".over");

describe("PhonePortal", () => {
  it("renders into the phone when it's there", () => {
    const phone = addPhone();
    render(false, "first");
    expect(over()?.parentElement).toBe(phone);
  });

  it("stays where it first rendered, so what's inside isn't remounted", () => {
    render(false, "first");
    const shown = over();
    addPhone();
    render(false, "again");
    expect(over()).toBe(shown);
    expect(shown?.parentElement).toBe(host);
  });

  it("looks for the phone again on each render when asked to", () => {
    render(true, "first");
    const phone = addPhone();
    render(true, "again");
    expect(over()?.parentElement).toBe(phone);
  });
});
