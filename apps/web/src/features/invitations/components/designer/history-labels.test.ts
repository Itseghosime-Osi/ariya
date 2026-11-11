import { describe, expect, it } from "vitest";
import { createInvitationDesign } from "../../design";
import { describeStep } from "./history-labels";

const base = createInvitationDesign({
  title: "Test",
  couple: "Ada & Kunle",
  date: "2027-03-20",
});
const edit = (fn: (d: typeof base) => typeof base) => fn(structuredClone(base));

describe("history step descriptions", () => {
  it("names the first step as the original", () => {
    expect(describeStep(null, base)).toBe("Original invitation");
  });

  it("says a layer was moved, resized, hidden or edited", () => {
    const id = base.layers[1].id;
    const patch = (p: Record<string, unknown>) =>
      edit((d) => ({
        ...d,
        layers: d.layers.map((l) => (l.id === id ? { ...l, ...p } : l)),
      }));
    expect(describeStep(base, patch({ x: 3 }))).toMatch(/^Moved /);
    expect(describeStep(base, patch({ width: 30 }))).toMatch(/^Resized /);
    expect(describeStep(base, patch({ visible: false }))).toMatch(/^Hid /);
    expect(describeStep(base, patch({ text: "New words" }))).toMatch(
      /^Edited /
    );
    expect(describeStep(base, patch({ locked: true }))).toMatch(/^Locked /);
  });

  it("reports additions, deletions and several changes", () => {
    const [first, ...rest] = base.layers;
    expect(describeStep(base, { ...base, layers: rest })).toMatch(/^Deleted /);
    expect(
      describeStep(
        { ...base, layers: rest },
        { ...base, layers: [first, ...rest] }
      )
    ).toMatch(/^Added /);
    expect(
      describeStep(base, {
        ...base,
        layers: base.layers.map((l) => ({ ...l, x: l.x + 1 })),
      })
    ).toBe(`Changed ${base.layers.length} layers`);
  });

  it("notices a reorder", () => {
    expect(
      describeStep(base, { ...base, layers: [...base.layers].reverse() })
    ).toBe("Reordered layers");
  });
});
