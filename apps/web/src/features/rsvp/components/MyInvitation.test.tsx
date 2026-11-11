import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  createInvitationDesign,
  ensureEntrySeal,
} from "@/features/invitations/design";
import { exportInvitation } from "@/features/invitations/export-service";
import { MyInvitation } from "./MyInvitation";
vi.mock("@/features/invitations/export-service", () => ({
  exportInvitation: vi.fn(),
}));
const props = {
  design: ensureEntrySeal(createInvitationDesign({ couple: "Ada & Kunle" })),
  coupleName: "Ada & Kunle",
  guestName: "Ọlá Adéṣọlá",
  entryCode: "ARY-LOCAL-TEST-ONLY",
};
afterEach(() => vi.clearAllMocks());
describe("guest invitation download", () => {
  it("uses the guarded document-resolution exporter and keeps the guest filename convention", async () => {
    vi.mocked(exportInvitation).mockResolvedValue({ ok: true });
    render(<MyInvitation {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Save my invitation" }));
    await waitFor(() => expect(exportInvitation).toHaveBeenCalledOnce());
    expect(vi.mocked(exportInvitation).mock.calls[0][0]).toMatchObject({
      design: props.design,
      eventId: "guest",
      coupleName: props.coupleName,
      fileBaseName: "invitation-Ọlá Adéṣọlá",
      format: "png",
    });
    expect(
      vi.mocked(exportInvitation).mock.calls[0][0].cardElement
    ).toHaveAttribute("data-invitation-canvas");
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
  });
  it("blocks duplicate downloads while preparing and permits a retry after failure", async () => {
    let finish!: (result: { ok: boolean }) => void;
    vi.mocked(exportInvitation).mockReturnValueOnce(
      new Promise((r) => (finish = r))
    );
    render(<MyInvitation {...props} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(exportInvitation).toHaveBeenCalledOnce();
    finish({ ok: false });
    await screen.findByRole("alert");
    expect(button).toBeEnabled();
    vi.mocked(exportInvitation).mockResolvedValue({ ok: true });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("cancels a pending download when leaving the page", async () => {
    let signal: AbortSignal | undefined;
    vi.mocked(exportInvitation).mockImplementation((request) => {
      signal = request.signal;
      return new Promise((resolve) =>
        signal?.addEventListener("abort", () =>
          resolve({ ok: false, cancelled: true })
        )
      );
    });
    const { unmount } = render(<MyInvitation {...props} />);
    fireEvent.click(screen.getByRole("button"));
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });
  it("keeps the saved artwork without a pass when access cards are off", () => {
    const { container } = render(<MyInvitation {...props} entryCode={null} />);
    expect(
      container.querySelector('[data-layer-id="names"]')
    ).toHaveTextContent("Ada & Kunle");
    expect(container.querySelector("[data-entry-seal]")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Save my invitation" })
    ).toBeEnabled();
  });
});
