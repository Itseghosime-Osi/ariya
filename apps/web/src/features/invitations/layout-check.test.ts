import { describe, expect, it } from "vitest";
import { designFromEvent } from "./design";
import { checkInvitationLayout, contrastRatio, parseHex } from "./layout-check";
import { applyLayoutPreset, LAYOUT_PRESETS } from "./presets";
import { estimateText, linesFor } from "./text-fit";
import type { InvitationDesign, InvitationLayer } from "./types";

const EVENT = {
  title: "Wedding",
  couple: "Folake Adeleke & Demola Alakija",
  date: "2026-12-12T15:00:00Z",
  venue: "Eko Hotel",
  area: "Victoria Island, Lagos",
  dressCode: "Gold and ivory",
  rsvpBy: "2026-11-30",
};

function house(): InvitationDesign {
  return designFromEvent(EVENT);
}

function withLayer(
  design: InvitationDesign,
  id: string,
  patch: Partial<InvitationLayer>
): InvitationDesign {
  return {
    ...design,
    layers: design.layers.map((layer) =>
      layer.id === id ? { ...layer, ...patch } : layer
    ),
  };
}

function textLayer(patch: Partial<InvitationLayer> = {}): InvitationLayer {
  return {
    id: "t",
    kind: "text",
    text: "Hello",
    x: 10,
    y: 10,
    width: 80,
    align: "center",
    font: "sans",
    size: 4,
    weight: 400,
    italic: false,
    tracking: 0,
    colorRole: "ink",
    color: null,
    visible: true,
    ...patch,
  };
}

describe("estimateText", () => {
  it("keeps a short line on one line at full size", () => {
    const estimate = estimateText(textLayer(), 5 / 7);
    expect(estimate.lines).toBe(1);
    expect(estimate.scale).toBe(1);
  });

  it("wraps long words onto more lines and counts hard line breaks", () => {
    const long = estimateText(
      textLayer({ text: "word ".repeat(40).trim(), width: 30 }),
      5 / 7
    );
    expect(long.lines).toBeGreaterThan(3);

    const breaks = estimateText(textLayer({ text: "a\nb\nc" }), 5 / 7);
    expect(breaks.lines).toBe(3);
  });

  it("shrinks names the way the card does, never below 45%", () => {
    const names = textLayer({
      kind: "names",
      text: "Oluwadamilare Adebayo-Ogunleye & Chimamanda Nwachukwu-Okonkwo",
      size: 9,
      font: "display",
      width: 60,
    });
    const estimate = estimateText(names, 5 / 7);
    expect(estimate.maxLines).toBe(2);
    expect(estimate.scale).toBeLessThan(1);
    expect(estimate.scale).toBeGreaterThanOrEqual(0.45);
  });

  it("never shrinks a layer set to grow", () => {
    const layer = textLayer({
      kind: "names",
      text: "word ".repeat(30).trim(),
      textFit: "grow",
    });
    expect(linesFor(layer)).toBeUndefined();
    expect(estimateText(layer, 5 / 7).scale).toBe(1);
  });

  it("reads capitals as wider than lower case", () => {
    const lower = estimateText(textLayer({ text: "together" }), 5 / 7);
    const upper = estimateText(
      textLayer({ text: "together", textTransform: "uppercase" }),
      5 / 7
    );
    expect(upper.inkWidth).toBeGreaterThan(lower.inkWidth);
  });
});

describe("checkInvitationLayout", () => {
  it("finds nothing to fix on the house design", () => {
    const result = checkInvitationLayout(house());
    expect(result.ok).toBe(true);
    expect(result.issues.filter((i) => i.severity !== "note")).toEqual([]);
    expect(result.boxes.map((box) => box.id)).toContain("names");
  });

  it.each(LAYOUT_PRESETS.map((preset) => preset.id))(
    "finds nothing to fix on the %s preset",
    (id) => {
      const result = checkInvitationLayout(applyLayoutPreset(house(), id));
      expect(result.issues.filter((i) => i.severity !== "note")).toEqual([]);
    }
  );

  it("flags words running off the card", () => {
    const result = checkInvitationLayout(
      withLayer(house(), "date", { x: 70, width: 60 })
    );
    const issue = result.issues.find((i) => i.kind === "off_card");
    expect(issue?.layerIds).toEqual(["date"]);
    expect(issue?.severity).toBe("problem");
    expect(result.ok).toBe(false);
  });

  it("treats a background shape bleeding off the edge as a note", () => {
    const design = house();
    design.layers.unshift({
      ...textLayer({ id: "bleed", kind: "shape", text: "" }),
      shape: "rect",
      x: -10,
      y: -10,
      width: 120,
      height: 40,
      fill: null,
    });
    const issue = checkInvitationLayout(design).issues.find(
      (i) => i.kind === "off_card"
    );
    expect(issue?.severity).toBe("note");
  });

  it("flags two lines of words on top of each other", () => {
    const result = checkInvitationLayout(
      withLayer(house(), "venue", { y: 67 })
    );
    const overlap = result.issues.find((i) => i.kind === "overlap");
    expect(overlap?.layerIds.sort()).toEqual(["date", "venue"]);
  });

  it("calls words over the entry seal a problem", () => {
    const design = house();
    design.layers.push({
      ...textLayer({ id: "code-1", kind: "code", text: "" }),
      x: 40,
      y: 70,
      width: 20,
    });
    const result = checkInvitationLayout(design);
    const overlap = result.issues.find(
      (i) => i.kind === "overlap" && i.layerIds.includes("code-1")
    );
    expect(overlap?.severity).toBe("problem");
  });

  it("flags names too long even at the smallest size", () => {
    const result = checkInvitationLayout(
      withLayer(house(), "names", {
        text: "Oluwadamilare Adebayo-Ogunleye ".repeat(6).trim(),
        size: 9,
        width: 40,
      })
    );
    const issue = result.issues.find((i) => i.kind === "too_long");
    expect(issue?.layerIds).toEqual(["names"]);
  });

  it("flags light words on a light card, and reads velvet as dark", () => {
    const pale = checkInvitationLayout(
      withLayer(house(), "message", { colorRole: "custom", color: "#f4efe6" })
    );
    expect(
      pale.issues.find((i) => i.kind === "low_contrast")?.layerIds
    ).toEqual(["message"]);

    // On velvet the card itself draws the paper roles in light colours.
    const velvet = house();
    velvet.background = { ...velvet.background, kind: "velvet" };
    expect(
      checkInvitationLayout(velvet).issues.filter(
        (i) => i.kind === "low_contrast"
      )
    ).toEqual([]);
  });

  it("checks words against a filled shape directly behind them", () => {
    const design = house();
    const message = design.layers.findIndex((layer) => layer.id === "message");
    design.layers.splice(message, 0, {
      ...textLayer({ id: "panel", kind: "shape", text: "" }),
      shape: "rect",
      x: 5,
      y: 45,
      width: 90,
      height: 15,
      fill: "#2a2118",
    });
    const issue = checkInvitationLayout(design).issues.find(
      (i) => i.kind === "low_contrast" && i.layerIds[0] === "message"
    );
    expect(issue?.behindLayerId).toBe("panel");
  });

  it("does not judge contrast over a picture", () => {
    const design = house();
    design.background = {
      kind: "image",
      imageUrl: "https://example.com/card.jpg",
      overlay: 0,
    };
    const result = checkInvitationLayout(
      withLayer(design, "message", { colorRole: "custom", color: "#f4efe6" })
    );
    expect(result.issues.some((i) => i.kind === "low_contrast")).toBe(false);
    expect(result.notes.join(" ")).toMatch(/picture/);
  });

  it("flags text too small to read and empty shown text", () => {
    const tiny = checkInvitationLayout(
      withLayer(house(), "footer", { size: 1.2 })
    );
    expect(tiny.issues.find((i) => i.kind === "tiny_text")?.layerIds).toEqual([
      "footer",
    ]);

    const empty = checkInvitationLayout(
      withLayer(house(), "kicker", { text: "  " })
    );
    expect(empty.issues.find((i) => i.kind === "empty_text")?.severity).toBe(
      "note"
    );
  });

  it("ignores hidden layers and lists problems first", () => {
    const hidden = checkInvitationLayout(
      withLayer(house(), "date", { x: 90, visible: false })
    );
    expect(hidden.issues.some((i) => i.layerIds.includes("date"))).toBe(false);

    const mixed = checkInvitationLayout(
      withLayer(withLayer(house(), "date", { x: 90 }), "footer", { size: 1.2 })
    );
    expect(mixed.issues[0].severity).toBe("problem");
  });
});

describe("colour helpers", () => {
  it("reads short and long hex and refuses anything else", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("#00000080")).toEqual([0, 0, 0]);
    expect(parseHex("rgb(0,0,0)")).toBeNull();
    expect(parseHex(null)).toBeNull();
  });

  it("matches the WCAG contrast of black on white", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#fff", "#fff")).toBeCloseTo(1, 5);
    expect(contrastRatio("red", "#fff")).toBeNull();
  });
});
