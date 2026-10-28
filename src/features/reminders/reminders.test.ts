import { describe, it, expect } from "vitest";
import { sendBatchReminderSchema } from "./schemas";

describe("Reminders schemas and filters", () => {
  it("validates batch reminder input with default awaiting filter", () => {
    const res = sendBatchReminderSchema.safeParse({
      subject: "Important celebration update",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.filter).toBe("awaiting");
      expect(res.data.subject).toBe("Important celebration update");
    }
  });

  it("validates specific recipient guest IDs", () => {
    const res = sendBatchReminderSchema.safeParse({
      filter: "all",
      subject: "Final call for seating",
      selectedGuestIds: [
        "b0000000-0000-0000-0000-000000000001",
        "b0000000-0000-0000-0000-000000000002",
      ],
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.selectedGuestIds?.length).toBe(2);
    }
  });

  it("rejects empty subject line", () => {
    const res = sendBatchReminderSchema.safeParse({
      subject: "",
    });
    expect(res.success).toBe(false);
  });
});
