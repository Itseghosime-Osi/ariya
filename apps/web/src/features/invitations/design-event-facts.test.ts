import { describe, expect, it } from "vitest";
import {
  applyEventFacts,
  createInvitationDesign,
  staleEventFacts,
} from "./design";

const event = {
  title: "Test",
  couple: "Ada & Kunle",
  date: "2027-03-20",
  venue: "The Lagos Event Centre",
  area: "Victoria Island, Lagos",
  dressCode: "Gold and ivory",
  rsvpBy: "2027-03-01",
};

describe("keeping a saved card in step with its event", () => {
  it("lists nothing while the card matches the event", () => {
    expect(staleEventFacts(createInvitationDesign(event), event)).toEqual([]);
  });

  it("lists only the changed facts, never the host's own wording", () => {
    const design = createInvitationDesign(event);
    design.layers = design.layers.map((l) =>
      l.id === "names" ? { ...l, text: "Our custom headline" } : l
    );
    const changed = {
      ...event,
      venue: "Eko Hotels",
      couple: "Someone Else",
      dressCode: "Aso-ebi",
    };
    const stale = staleEventFacts(design, changed);
    expect(stale.map((s) => s.id).sort()).toEqual(["dressCode", "venue"]);
    expect(stale.find((s) => s.id === "venue")?.fresh).toContain("Eko Hotels");
  });

  it("updates just those lines and keeps their layout", () => {
    const design = createInvitationDesign(event);
    const stale = staleEventFacts(design, { ...event, venue: "Eko Hotels" });
    const next = applyEventFacts(design, stale);
    const before = design.layers.find((l) => l.id === "venue")!;
    const after = next.layers.find((l) => l.id === "venue")!;
    expect(after.text).toContain("Eko Hotels");
    expect({ ...after, text: "" }).toEqual({ ...before, text: "" });
    expect(next.layers.find((l) => l.id === "names")).toEqual(
      design.layers.find((l) => l.id === "names")
    );
    expect(staleEventFacts(next, { ...event, venue: "Eko Hotels" })).toEqual(
      []
    );
  });

  it("ignores hidden lines", () => {
    const design = createInvitationDesign(event);
    design.layers = design.layers.map((l) =>
      l.id === "venue" ? { ...l, visible: false } : l
    );
    expect(staleEventFacts(design, { ...event, venue: "Eko Hotels" })).toEqual(
      []
    );
  });
});
