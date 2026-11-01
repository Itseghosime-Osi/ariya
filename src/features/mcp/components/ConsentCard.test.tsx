import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../consent", () => ({ decideConsentAction: vi.fn() }));

import { decideConsentAction } from "../consent";
import {
  UNKNOWN_APP_ACKNOWLEDGEMENT,
  classifyApp,
  type AppTrust,
} from "../app-trust";
import { ConsentCard, type ConsentRequest } from "./ConsentCard";

const ACKNOWLEDGEMENT =
  "I understand this app has not been verified by Àríyá. I am choosing to connect it at my own risk, and I accept responsibility for what it does with my account and my guests' information.";

function request(
  redirectUri: string,
  overrides: Partial<ConsentRequest> = {}
): ConsentRequest {
  const trust: AppTrust = classifyApp(redirectUri);

  return {
    authorizationId: "auth-1",
    clientName: "Some App",
    redirectHost: trust.host || redirectUri,
    accountEmail: "host@example.com",
    scopes: ["openid", "email"],
    trust,
    ...overrides,
  };
}

describe("a known app", () => {
  it("is named after its vendor, not after what the client called itself", () => {
    const { container } = render(
      <ConsentCard
        request={request("https://claude.ai/api/mcp/auth_callback")}
      />
    );

    expect(screen.getByText("Known app")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /Claude wants to connect/ })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Some App/)).not.toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: "Approve" })).not.toBeDisabled();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByText("This app has not been verified")
    ).not.toBeInTheDocument();
  });

  it("gives each vendor its own name and monogram", () => {
    render(
      <ConsentCard
        request={request(
          "https://chatgpt.com/connector_platform_oauth_redirect"
        )}
      />
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /ChatGPT wants to connect/,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("G")).toBeInTheDocument();
  });

  it("shows the vendor monogram in place of a logo", () => {
    render(
      <ConsentCard
        request={request("https://claude.ai/api/mcp/auth_callback")}
      />
    );

    expect(screen.getByText("C")).toBeInTheDocument();
  });
});

describe("an app on the host's computer", () => {
  it("is labelled as local, never as verified, and hides the client name", () => {
    render(<ConsentCard request={request("http://localhost:3118/callback")} />);

    expect(screen.getByText("An app on your own computer")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /An app on your computer wants to connect/,
      })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Some App/)).not.toBeInTheDocument();
    expect(screen.queryByText("Known app")).not.toBeInTheDocument();
    expect(screen.queryByText(/verified/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).not.toBeDisabled();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

describe("an unknown app", () => {
  const stranger = "https://claude.ai.evil.com/api/mcp/auth_callback";

  it("shows the red warning and the full return address", () => {
    render(<ConsentCard request={request(stranger)} />);

    expect(
      screen.getByText("This app has not been verified")
    ).toBeInTheDocument();
    expect(screen.getByText(stranger)).toBeInTheDocument();
    expect(screen.getByText("Not verified")).toBeInTheDocument();
  });

  it("renders no image, only the neutral tile", () => {
    const { container } = render(<ConsentCard request={request(stranger)} />);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Some App wants to connect")).toBeInTheDocument();
  });

  it("truncates the name", () => {
    render(
      <ConsentCard
        request={request(stranger, { clientName: "A".repeat(200) })}
      />
    );

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading.textContent).toContain("…");
    expect(heading.textContent!.length).toBeLessThan(120);
  });

  it("renders a hostile name as text, not as markup", () => {
    const { container } = render(
      <ConsentCard
        request={request(stranger, { clientName: "<script>x</script>" })}
      />
    );

    expect(container.querySelector("script")).toBeNull();
    expect(
      screen.getByText(/<script>x<\/script> wants to connect/)
    ).toBeInTheDocument();
  });

  it("keeps Approve disabled until the acknowledgement is ticked", () => {
    render(<ConsentCard request={request(stranger)} />);

    const approve = screen.getByRole("button", { name: "Approve" });
    const checkbox = screen.getByRole("checkbox", { name: ACKNOWLEDGEMENT });

    expect(approve).toBeDisabled();

    fireEvent.click(checkbox);

    expect(approve).not.toBeDisabled();
  });

  it("posts the acknowledgement once the box is ticked", async () => {
    render(<ConsentCard request={request(stranger)} />);

    fireEvent.click(screen.getByRole("checkbox", { name: ACKNOWLEDGEMENT }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(vi.mocked(decideConsentAction)).toHaveBeenCalled()
    );

    const formData = vi.mocked(decideConsentAction).mock.calls[0][1];
    expect(formData.get("acknowledge_unknown_app")).toBe(
      UNKNOWN_APP_ACKNOWLEDGEMENT
    );
    expect(formData.get("decision")).toBe("approve");
  });
});

describe("no acknowledgement for recognised apps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers no checkbox at all", () => {
    render(
      <ConsentCard
        request={request(
          "https://chatgpt.com/connector_platform_oauth_redirect"
        )}
      />
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
