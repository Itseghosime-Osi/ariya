import { describe, expect, it } from "vitest";
import { DOC_PAGES } from "@/lib/docs";
import { GET, buildLlmsTxt } from "./route";

describe("/llms.txt", () => {
  it("is plain text that names the product and links every manual page", async () => {
    const res = GET();
    expect(res.headers.get("content-type")).toContain("text/plain");
    const text = await res.text();
    expect(text.startsWith("# Àríyá")).toBe(true);
    for (const p of DOC_PAGES)
      expect(text).toContain(`/documentation/${p.slug}`);
    expect(buildLlmsTxt()).not.toMatch(/prototype|tech4youth/i);
  });
});
