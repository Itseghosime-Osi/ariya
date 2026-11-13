import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import InvitationDesignLoading from "./loading";

describe("studio loading skeleton", () => {
  const html = renderToStaticMarkup(<InvitationDesignLoading />);

  it("is announced as a status with a plain name", () => {
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading the invitation studio");
  });

  it("draws the studio's frame, so the screen is never blank", () => {
    expect(html).toContain('data-testid="studio-loading"');
    // header, tool rail, card and side panel placeholders
    expect(html.match(/animate-pulse/g)?.length).toBeGreaterThanOrEqual(8);
  });

  it("stops pulsing for people who ask for less motion", () => {
    const pulses = html.match(/animate-pulse/g)?.length ?? 0;
    const calm = html.match(/motion-reduce:animate-none/g)?.length ?? 0;
    expect(calm).toBe(pulses);
  });
});
