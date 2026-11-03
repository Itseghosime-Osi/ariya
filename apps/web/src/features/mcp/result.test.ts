import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  dataResult,
  errorMessage,
  errorResult,
  paged,
  runTool,
  ToolError,
} from "./result";

const caller = { user: { id: "user-1" }, clientId: "client-abc" };

/** Every line `runTool` wrote, parsed back out of `console.info`. */
function loggedLines(): Record<string, unknown>[] {
  return vi
    .mocked(console.info)
    .mock.calls.map((call) => JSON.parse(String(call[0])));
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runTool", () => {
  it("logs the host, the connected app, the tool and a success", async () => {
    const result = await runTool(caller, "list_guests", {}, async () =>
      dataResult({ items: [] })
    );

    expect(result.isError).toBeUndefined();
    expect(loggedLines()).toEqual([
      {
        event: "mcp_tool_call",
        userId: "user-1",
        clientId: "client-abc",
        tool: "list_guests",
        outcome: "ok",
      },
    ]);
  });

  it("logs an error outcome for a tool that answered with one", async () => {
    await runTool(caller, "add_guest", {}, async () =>
      errorResult("That guest is already on this celebration.")
    );

    expect(loggedLines()[0]).toMatchObject({
      tool: "add_guest",
      outcome: "error",
    });
    // The reason itself is not part of the log line.
    expect(JSON.stringify(loggedLines()[0])).not.toContain("already on");
  });

  it("turns a thrown error into a safe result and still logs the call", async () => {
    const result = await runTool(caller, "import_guests", {}, async () => {
      throw new ToolError("Nothing was written.");
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toEqual({
      type: "text",
      text: "Nothing was written.",
    });
    expect(loggedLines()[0]).toMatchObject({
      tool: "import_guests",
      outcome: "error",
    });
  });

  it("never logs guest text that a tool handled", async () => {
    const secret = "Ada Obi, allergic to peanuts, +234 801 234 5678";

    await runTool(caller, "list_guests", {}, async () =>
      dataResult({ items: [secret] })
    );

    expect(JSON.stringify(loggedLines())).not.toContain("Ada Obi");
  });

  it("logs the database's code and hint rather than its message", async () => {
    const inserted: Record<string, unknown>[] = [];
    const client = {
      from: () => ({
        insert: async (row: Record<string, unknown>) => {
          inserted.push(row);
          return { error: null };
        },
      }),
    };

    const result = await runTool(
      { ...caller, client: client as never },
      "propose_hall_layout",
      { note: "Proposed a hall layout" },
      async () => {
        throw new ToolError(
          "Could not record that proposal. Nothing was changed.",
          { diagnostic: { code: "42501", hint: "NOT_PERMITTED" } }
        );
      }
    );

    expect(result.isError).toBe(true);
    expect(loggedLines()[0]).toMatchObject({
      tool: "propose_hall_layout",
      outcome: "error",
      code: "42501",
      hint: "NOT_PERMITTED",
    });
    expect(inserted[0]).toMatchObject({
      note: "Proposed a hall layout (42501 NOT_PERMITTED)",
    });

    const everything = JSON.stringify([loggedLines(), inserted]);
    expect(everything).not.toContain("row-level");
    expect(everything).not.toContain("Could not record");
  });

  it("leaves the log line and the note alone when no code came back", async () => {
    const inserted: Record<string, unknown>[] = [];
    const client = {
      from: () => ({
        insert: async (row: Record<string, unknown>) => {
          inserted.push(row);
          return { error: null };
        },
      }),
    };

    await runTool(
      { ...caller, client: client as never },
      "propose_seating_plan",
      { note: "Proposed a seating plan" },
      async () => {
        throw new ToolError("Could not record that proposal. Nothing changed.");
      }
    );

    expect(loggedLines()[0]).not.toHaveProperty("code");
    expect(loggedLines()[0]).not.toHaveProperty("hint");
    expect(inserted[0]).toMatchObject({ note: "Proposed a seating plan" });
  });

  it("records a null client id for a host calling with their own session", async () => {
    await runTool(
      { user: { id: "user-2" }, clientId: null },
      "list_events",
      {},
      async () => dataResult([])
    );

    expect(loggedLines()[0]).toMatchObject({
      userId: "user-2",
      clientId: null,
    });
  });
});

describe("errorMessage", () => {
  it("passes a tool's own message through", () => {
    expect(errorMessage(new ToolError("Try again later."))).toBe(
      "Try again later."
    );
  });

  it("hides anything that is not meant for a model", () => {
    expect(errorMessage({ code: "PGRST116", details: "raw postgres" })).toBe(
      "Something went wrong on Àríyá. Nothing was changed."
    );
    expect(errorMessage(undefined)).toBe(
      "Something went wrong on Àríyá. Nothing was changed."
    );
  });
});

describe("paged", () => {
  it("says whether the caller is seeing everything", () => {
    expect(
      paged([1, 2], { totalCount: 9, page: 1, pageSize: 2 }).truncated
    ).toBe(true);
    expect(
      paged([1, 2], { totalCount: 2, page: 1, pageSize: 2 }).truncated
    ).toBe(false);
  });

  it("honours an explicit truncation flag", () => {
    expect(
      paged([1, 2], {
        totalCount: 2,
        page: 1,
        pageSize: 2,
        truncated: true,
      }).truncated
    ).toBe(true);
  });
});
