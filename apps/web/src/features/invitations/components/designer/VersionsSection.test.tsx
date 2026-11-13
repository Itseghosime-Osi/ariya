import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VersionsSection } from "./VersionsSection";
import { createInvitationDesign } from "../../design";

const actions = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  load: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../../versions-actions", () => ({
  listDesignVersionsAction: actions.list,
  saveDesignVersionAction: actions.save,
  loadDesignVersionAction: actions.load,
  deleteDesignVersionAction: actions.remove,
}));

const make = (couple: string) =>
  createInvitationDesign({
    title: "A celebration",
    couple,
    date: "2026-12-12",
    venue: "The Hall",
    area: "Lagos",
    dressCode: null,
    rsvpBy: null,
    theme: "royal_gold",
  });
const EVENT = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  Object.values(actions).forEach((f) => f.mockReset());
});

describe("VersionsSection", () => {
  it("stays out of the way when saved versions are not available", async () => {
    actions.list.mockResolvedValue({ ok: false, error: "unavailable" });
    const { container } = render(
      <VersionsSection
        eventId={EVENT}
        design={make("Ada & Kunle")}
        onRestore={vi.fn()}
      />
    );
    await waitFor(() => expect(actions.list).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("saves a named version of the current design and lists it", async () => {
    const current = make("Ada & Kunle");
    actions.list
      .mockResolvedValueOnce({ ok: true, versions: [] })
      .mockResolvedValueOnce({
        ok: true,
        versions: [
          {
            id: "v1",
            name: "Before the venue change",
            createdAt: "2026-11-12T14:05:00Z",
          },
        ],
      });
    actions.save.mockResolvedValue({
      ok: true,
      version: {
        id: "v1",
        name: "Before the venue change",
        createdAt: "2026-11-12T14:05:00Z",
      },
    });
    render(
      <VersionsSection eventId={EVENT} design={current} onRestore={vi.fn()} />
    );
    fireEvent.change(await screen.findByLabelText("Name this version"), {
      target: { value: "Before the venue change" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Before the venue change")).toBeTruthy();
    expect(actions.save).toHaveBeenCalledWith(
      EVENT,
      "Before the venue change",
      current
    );
  });

  it("restores exactly the design that was saved", async () => {
    const earlier = make("Ada & Kunle");
    const onRestore = vi.fn();
    actions.list.mockResolvedValue({
      ok: true,
      versions: [
        { id: "v1", name: "First look", createdAt: "2026-11-12T09:00:00Z" },
      ],
    });
    actions.load.mockResolvedValue({ ok: true, design: earlier });
    render(
      <VersionsSection
        eventId={EVENT}
        design={make("Someone Else")}
        onRestore={onRestore}
      />
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Restore First look" })
    );
    await waitFor(() => expect(onRestore).toHaveBeenCalledTimes(1));
    expect(onRestore.mock.calls[0][0]).toEqual(earlier);
    expect(
      await screen.findByText(/Undo brings your last design back/)
    ).toBeTruthy();
  });
});
