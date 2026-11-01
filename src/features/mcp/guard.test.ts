import { describe, it, expect, vi } from "vitest";
import {
  requireReadAccess,
  requireWriteAccess,
  type ToolContext,
} from "./guard";
import { ToolError } from "./result";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const NO_ACCESS =
  "That celebration does not exist, or you do not have access to it.";

function context(
  rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>
): ToolContext {
  return {
    client: { rpc } as unknown as ToolContext["client"],
    user: { id: "user-1" } as unknown as ToolContext["user"],
    clientId: null,
  };
}

describe("requireWriteAccess", () => {
  it("lets an owner or planner through", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });

    await expect(
      requireWriteAccess(context(rpc), EVENT_ID)
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("has_event_role", {
      p_event_id: EVENT_ID,
      p_roles: ["owner", "planner"],
    });
  });

  it("refuses anyone else with the no-access message", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });

    await expect(requireWriteAccess(context(rpc), EVENT_ID)).rejects.toThrow(
      new ToolError(NO_ACCESS)
    );
  });

  it("fails closed when the role check itself errors", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "connection reset" },
    });

    await expect(requireWriteAccess(context(rpc), EVENT_ID)).rejects.toThrow(
      "Could not confirm your access to that celebration."
    );
  });
});

describe("requireReadAccess", () => {
  it("lets every role the team page can add through", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });

    await expect(
      requireReadAccess(context(rpc), EVENT_ID)
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("has_event_role", {
      p_event_id: EVENT_ID,
      p_roles: ["owner", "planner", "couple", "staff"],
    });
  });

  it("answers a stranger exactly like a missing celebration", async () => {
    const denied = vi.fn().mockResolvedValue({ data: false, error: null });
    const errored = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "connection reset" },
    });

    await expect(requireReadAccess(context(denied), EVENT_ID)).rejects.toThrow(
      new ToolError(NO_ACCESS)
    );
    // A failed check is not the same as "not yours" — it must not leak as one.
    await expect(requireReadAccess(context(errored), EVENT_ID)).rejects.toThrow(
      "Could not confirm your access to that celebration."
    );
  });
});
