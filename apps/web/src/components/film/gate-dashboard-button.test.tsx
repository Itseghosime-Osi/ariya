import React, { act } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GateDashboardButton } from "./gate-dashboard-button";

const mockGetSession = vi.fn();
const mockUnsubscribe = vi.fn();
type AuthListener = (event: string, session: unknown) => void;
const mockOnAuthStateChange = vi.fn((_callback?: AuthListener) => ({
  data: { subscription: { unsubscribe: mockUnsubscribe } },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

beforeEach(() => {
  mockGetSession.mockReset();
  mockOnAuthStateChange.mockClear();
  mockUnsubscribe.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("GateDashboardButton", () => {
  it("renders 'Go to dashboard' and links to /events when user is signed in", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
    });

    render(<GateDashboardButton />);

    const link = await screen.findByRole("link", { name: /Go to dashboard/i });
    expect(link).toHaveAttribute("href", "/events");
  });

  it("renders 'Sign in to dashboard' and links to /sign-in when user is not signed in", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    render(<GateDashboardButton />);

    const link = await screen.findByRole("link", {
      name: /Sign in to dashboard/i,
    });
    expect(link).toHaveAttribute("href", "/sign-in?next=%2Fevents");
  });

  it("updates dynamically when authentication state changes", async () => {
    let authCallback: AuthListener | null = null;
    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback ?? null;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<GateDashboardButton />);

    const link = await screen.findByRole("link", {
      name: /Sign in to dashboard/i,
    });
    expect(link).toHaveAttribute("href", "/sign-in?next=%2Fevents");

    // Simulate login event
    act(() => {
      authCallback?.("SIGNED_IN", { user: { id: "user-456" } });
    });

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /Go to dashboard/i })
      ).toHaveAttribute("href", "/events");
    });
  });
});
