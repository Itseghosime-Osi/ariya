import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { createInvitationDesign, ensureEntrySeal } from "../design";
import { InvitationCard } from "./InvitationCard";
const design = () =>
  ensureEntrySeal(createInvitationDesign({ couple: "Ada & Kunle" }));
describe("functional entry seals", () => {
  it("never exposes a pass before acceptance unless the host explicitly requests a sample", () => {
    const { container, rerender } = render(
      <InvitationCard design={design()} coupleName="Ada & Kunle" />
    );
    expect(container.querySelector("[data-entry-seal]")).toBeNull();
    rerender(
      <InvitationCard design={design()} coupleName="Ada & Kunle" sampleEntry />
    );
    expect(container.querySelector("[data-entry-seal]")).not.toBeNull();
  });
  it("keeps imported destructive effects off the code while leaving them on surrounding artwork", () => {
    const d = design();
    for (const layer of d.layers)
      Object.assign(layer, {
        opacity: 0,
        blur: 30,
        flipX: true,
        flipY: true,
        blendMode: "screen",
      });
    const { container } = render(
      <InvitationCard
        design={d}
        coupleName="Ada & Kunle"
        entryCode="ARY-LOCAL-TEST-A"
      />
    );
    const seal = container.querySelector<HTMLElement>("[data-entry-seal]")!;
    expect(seal.style.opacity).toBe("1");
    expect(seal.style.filter).toBe("none");
    expect(seal.style.mixBlendMode).toBe("normal");
    expect(seal.style.transform).toBe("");
    const names = container.querySelector<HTMLElement>(
      '[data-layer-id="names"]'
    )!;
    expect(names.style.opacity).toBe("0");
    expect(names.style.filter).toContain("blur(30px)");
    expect(names.style.transform).toContain("scaleX(-1)");
  });
  it("uses guest-specific artwork instead of the host's sample and never prints the code as text", () => {
    const { container, rerender } = render(
      <InvitationCard design={design()} coupleName="Ada & Kunle" sampleEntry />
    );
    const sample = container.querySelector("[data-entry-seal]")!.innerHTML;
    rerender(
      <InvitationCard
        design={design()}
        coupleName="Ada & Kunle"
        sampleEntry
        entryCode="ARY-LOCAL-TEST-A"
      />
    );
    const first = container.querySelector("[data-entry-seal]")!.innerHTML;
    rerender(
      <InvitationCard
        design={design()}
        coupleName="Ada & Kunle"
        entryCode="ARY-LOCAL-TEST-B"
      />
    );
    expect(first === sample).toBe(false);
    expect(
      container.querySelector("[data-entry-seal]")!.innerHTML === first
    ).toBe(false);
    expect(container.textContent).not.toContain("ARY-LOCAL");
  });
  it("keeps rounded paper corners in document units at fitted and native widths", () => {
    const d = {
      ...design(),
      canvas: {
        ratio: 5 / 7,
        widthPx: 1080,
        heightPx: 1512,
        edgeStyle: "rounded" as const,
        cornerRadiusPx: 16,
      },
    };
    const { container } = render(
      <InvitationCard design={d} coupleName="Ada & Kunle" />
    );
    const paper = container.querySelector<HTMLElement>(
      "[data-invitation-canvas]"
    )!;
    const [rx, ry] = paper.style.borderRadius.split("/").map(parseFloat);
    for (const width of [390, 1080]) {
      expect((rx / 100) * width).toBeCloseTo((ry / 100) * (width / (5 / 7)), 6);
      expect((rx / 100) * width).toBeCloseTo((16 * width) / 1080, 6);
    }
  });
});

describe("inline text editing", () => {
  it("leaves the typed words to the browser so the caret is not reset on every keystroke", () => {
    const d = design();
    const id = d.layers.find((l) => l.id === "names")!.id;
    const at = (text: string) => ({
      ...d,
      layers: d.layers.map((l) => (l.id === id ? { ...l, text } : l)),
    });
    const { container, rerender } = render(
      <InvitationCard
        design={at("Ada")}
        coupleName="Ada & Kunle"
        editingLayerId={id}
      />
    );
    const box = container.querySelector<HTMLElement>("[data-editing-text]")!;
    const textNode = box.firstChild;
    expect(box.textContent).toBe("Ada");
    // Each keystroke updates the document; the editor's own text node must not be rewritten.
    rerender(
      <InvitationCard
        design={at("Ada & Kunle")}
        coupleName="Ada & Kunle"
        editingLayerId={id}
      />
    );
    expect(container.querySelector("[data-editing-text]")).toBe(box);
    expect(box.firstChild).toBe(textNode);
    expect(box.textContent).toBe("Ada");
  });
});
