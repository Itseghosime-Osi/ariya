import { describe, it, expect } from "vitest";
import {
  inviteTeamMemberSchema,
  updateTeamMemberRoleSchema,
  removeTeamMemberSchema,
  acceptTeamInviteSchema,
} from "./schemas";

describe("Team feature schemas", () => {
  it("validates valid team invitation inputs", () => {
    const res = inviteTeamMemberSchema.safeParse({
      email: "planner@lagos.ng",
      role: "planner",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBe("planner@lagos.ng");
      expect(res.data.role).toBe("planner");
    }
  });

  it("rejects malformed email for team invitation", () => {
    const res = inviteTeamMemberSchema.safeParse({
      email: "not-an-email",
      role: "staff",
    });
    expect(res.success).toBe(false);
  });

  it("rejects unauthorized role value", () => {
    const res = inviteTeamMemberSchema.safeParse({
      email: "test@lagos.ng",
      role: "superadmin",
    });
    expect(res.success).toBe(false);
  });

  it("validates role update payload with uuid", () => {
    const valid = updateTeamMemberRoleSchema.safeParse({
      targetUserId: "a0000000-0000-0000-0000-000000000001",
      newRole: "staff",
    });
    expect(valid.success).toBe(true);

    const invalid = updateTeamMemberRoleSchema.safeParse({
      targetUserId: "invalid-id",
      newRole: "staff",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates remove member payload", () => {
    const res = removeTeamMemberSchema.safeParse({
      targetUserId: "a0000000-0000-0000-0000-000000000001",
    });
    expect(res.success).toBe(true);
  });

  it("validates accept invitation token", () => {
    expect(acceptTeamInviteSchema.safeParse({ token: "tok_123" }).success).toBe(
      true
    );
    expect(acceptTeamInviteSchema.safeParse({ token: "" }).success).toBe(false);
  });
});
