import React from "react";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site/site-header";
import { FilmNav } from "./film-parts";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push }),
}));

function landingNavigation() {
  return render(
    <SiteHeader renderHeader={(trigger) => <FilmNav {...trigger} />} />
  );
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  push.mockClear();
});
afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("cur-out", "cm-on");
  vi.unstubAllGlobals();
});

describe("landing page menu", () => {
  it("opens on click and restores focus when closed", async () => {
    const user = userEvent.setup();
    landingNavigation();
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(dialog).toBeVisible();
    expect(button).toHaveAttribute("aria-expanded", "true");
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("supports keyboard opening, trapped focus and Escape", async () => {
    const user = userEvent.setup();
    landingNavigation();
    const button = screen.getByRole("button", { name: "Menu" });
    button.focus();
    await user.keyboard("{Enter}");
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    await waitFor(() =>
      expect(
        within(dialog).getByRole("link", { name: /01 The film/ })
      ).toHaveFocus()
    );
    const first = within(dialog).getByRole("button", { name: "Close" });
    const last = within(dialog).getByRole("link", {
      name: "Open a sample invitation",
    });
    last.focus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("navigates from a menu link through the existing curtain", async () => {
    const user = userEvent.setup();
    landingNavigation();
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("link", {
        name: /About Àríyá/,
      })
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/about"));
  });
});
