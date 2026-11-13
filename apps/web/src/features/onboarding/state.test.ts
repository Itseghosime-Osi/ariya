import { describe, expect, it } from "vitest";
import {
  firstSteps,
  mergeOnboarding,
  readOnboarding,
  readRole,
  tourStops,
} from "./state";

describe("readOnboarding", () => {
  it("reads nothing from an account that has seen nothing", () => {
    expect(readOnboarding(undefined)).toEqual({});
    expect(readOnboarding({ full_name: "Ada" })).toEqual({});
  });

  it("keeps the known flags and drops anything malformed", () => {
    expect(
      readOnboarding({
        onboarding: {
          welcomed: true,
          tour: "done",
          firstStepsHidden: true,
          tips: ["check-in", "check-in", "BAD KEY", 3],
          extra: "ignored",
        },
      })
    ).toEqual({
      welcomed: true,
      tour: "done",
      firstStepsHidden: true,
      tips: ["check-in"],
    });
    expect(
      readOnboarding({ onboarding: { tour: "later", welcomed: "yes" } })
    ).toEqual({});
  });
});

describe("readRole", () => {
  it("is a planner only when sign-up said so", () => {
    expect(readRole({ role: "planner" })).toBe("planner");
    expect(readRole({ role: "couple" })).toBe("couple");
    expect(readRole({})).toBe("couple");
    expect(readRole(null)).toBe("couple");
  });
});

describe("mergeOnboarding", () => {
  it("adds tips without repeats and keeps earlier flags", () => {
    const a = mergeOnboarding(
      { welcomed: true, tips: ["check-in"] },
      { tips: ["run-sheet", "check-in"] }
    );
    expect(a).toEqual({ welcomed: true, tips: ["check-in", "run-sheet"] });
    expect(mergeOnboarding(a, { tour: "skipped" }).tour).toBe("skipped");
  });
});

describe("firstSteps", () => {
  const none = {
    guests: 0,
    invitationDesigned: false,
    invitesSent: 0,
    tables: 0,
    teamMembers: 1,
  };

  it("starts with nothing done, in the order a host needs them", () => {
    const steps = firstSteps("e1", none, "couple");
    expect(steps.map((s) => s.key)).toEqual([
      "guests",
      "invitation",
      "send",
      "seating",
      "team",
    ]);
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(steps[0].href).toBe("/events/e1/guests");
  });

  it("ticks each step from the real plan; the creator alone is not a team", () => {
    const steps = firstSteps(
      "e1",
      {
        guests: 120,
        invitationDesigned: true,
        invitesSent: 3,
        tables: 12,
        teamMembers: 2,
      },
      "couple"
    );
    expect(steps.every((s) => s.done)).toBe(true);
    expect(
      firstSteps("e1", { ...none, teamMembers: 1 }, "couple")[4].done
    ).toBe(false);
  });

  it("speaks to a planner about their client", () => {
    expect(firstSteps("e1", none, "planner")[4].label).toBe(
      "Invite your client and team"
    );
    expect(firstSteps("e1", none, "couple")[4].label).toBe("Invite your team");
  });
});

describe("tourStops", () => {
  it("is five stops for either kind of host, and only a planner hears about switching", () => {
    const couple = tourStops("couple");
    const planner = tourStops("planner");
    expect(couple).toHaveLength(5);
    expect(planner).toHaveLength(5);
    expect(couple.map((s) => s.key)).not.toContain("switcher");
    expect(planner.map((s) => s.key)).toContain("switcher");
    expect(couple.map((s) => s.key)).toContain("guests");
  });
});
