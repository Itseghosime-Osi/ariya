import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSearch } from "./global-search";
import { globalSearchAction } from "@/features/search/actions";
import type { GlobalSearchResults } from "@/features/search/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/search/actions", () => ({ globalSearchAction: vi.fn() }));
vi.mock("./global-search-results", () => ({
  GlobalSearchResultsList: ({ results }: { results: GlobalSearchResults }) => (
    <div>{JSON.stringify(results)}</div>
  ),
}));
const empty: GlobalSearchResults = { events: [], guests: [], vendors: [] };
const tick = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
};

describe("global search requests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it("makes one request after a burst of typing", async () => {
    vi.mocked(globalSearchAction).mockResolvedValue({ data: empty });
    render(<GlobalSearch open onOpenChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    for (const value of ["A", "Ad", "Ade", "Adewale"])
      fireEvent.change(input, { target: { value } });
    expect(globalSearchAction).not.toHaveBeenCalled();
    await tick();
    expect(globalSearchAction).toHaveBeenCalledExactlyOnceWith("Adewale");
  });
  it("does not restore results after the input has been cleared", async () => {
    let resolve!: (value: { data: GlobalSearchResults }) => void;
    vi.mocked(globalSearchAction).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    render(<GlobalSearch open onOpenChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Adewale" } });
    await tick();
    fireEvent.change(input, { target: { value: "" } });
    await act(async () => {
      resolve({ data: empty });
    });
    expect(screen.queryByText(JSON.stringify(empty))).not.toBeInTheDocument();
    expect(screen.getByText("Quick Navigation")).toBeInTheDocument();
  });
  it("cancels pending work when the dialog closes", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <GlobalSearch open onOpenChange={onOpenChange} />
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Adewale" },
    });
    rerender(<GlobalSearch open={false} onOpenChange={onOpenChange} />);
    await tick();
    expect(globalSearchAction).not.toHaveBeenCalled();
  });
});
