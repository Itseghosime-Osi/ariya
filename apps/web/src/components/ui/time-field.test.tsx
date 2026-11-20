import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeField, formatClock } from "./time-field";

describe("TimeField", () => {
  it("writes times the way a host reads them", () => {
    expect(formatClock("14:30")).toBe("2:30 PM");
    expect(formatClock("00:05")).toBe("12:05 AM");
    expect(formatClock("12:00")).toBe("12:00 PM");
    expect(formatClock("")).toBe("");
  });

  it("saves once, when the sheet closes, not on every tap", async () => {
    const onChange = vi.fn();
    render(<TimeField label="Caterer arrives" value="" onChange={onChange} />);

    await userEvent.click(
      screen.getByRole("button", { name: /Caterer arrives: no time set/ })
    );
    await userEvent.click(screen.getByRole("button", { name: "10 o'clock" }));
    await userEvent.click(screen.getByRole("button", { name: "30 minutes" }));
    await userEvent.click(screen.getByRole("button", { name: "AM" }));
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("10:30");
  });

  it("does not save when nothing changed", async () => {
    const onChange = vi.fn();
    render(<TimeField label="Guests in" value="14:00" onChange={onChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Guests in: 2:00 PM/ })
    );
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
