import { describe, it, expect, vi } from "vitest";
import type { ToolContext } from "../guard";
import { describeConnection } from "./read";

function context(
  rpc: () => Promise<{ data: boolean | null; error: unknown }>,
  clientId: string | null
): ToolContext {
  return {
    client: { rpc } as unknown as ToolContext["client"],
    user: { id: "user-1" } as unknown as ToolContext["user"],
    clientId,
  };
}

describe("whoami", () => {
  it("asks the database, not this process, how the token is treated", async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));

    await expect(
      describeConnection(context(rpc, "client-123"))
    ).resolves.toEqual({
      clientId: "client-123",
      databaseTreatsThisTokenAsApp: true,
    });
    expect(rpc).toHaveBeenCalledWith("is_app_token");
  });

  it("reports a password-grant token as an ordinary session", async () => {
    const rpc = vi.fn(async () => ({ data: false, error: null }));

    await expect(describeConnection(context(rpc, null))).resolves.toEqual({
      clientId: null,
      databaseTreatsThisTokenAsApp: false,
    });
  });

  it("fails closed when the database cannot answer", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "connection reset" },
    }));

    await expect(
      describeConnection(context(rpc, "client-123"))
    ).rejects.toThrow(
      "Could not confirm how the database treats this connection."
    );
  });
});
