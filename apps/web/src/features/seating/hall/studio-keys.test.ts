// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isTyping, onControl } from "./studio-config";

describe("studio keys", () => {
  it("leave arrows and Delete to a focused button or control", () => {
    const panel = document.createElement("div");
    panel.innerHTML = `
      <button id="fewer">−</button>
      <div role="tab" id="tab"><span id="inside">Room</span></div>
      <div id="board"></div>
      <input id="field" />`;
    document.body.appendChild(panel);
    const el = (id: string) => document.getElementById(id);
    expect(onControl(el("fewer"))).toBe(true);
    expect(onControl(el("inside"))).toBe(true);
    expect(onControl(el("board"))).toBe(false);
    expect(isTyping(el("field"))).toBe(true);
    expect(onControl(null)).toBe(false);
  });
});
