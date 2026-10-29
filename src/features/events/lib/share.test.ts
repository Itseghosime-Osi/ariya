import { describe, expect, it } from "vitest";
import { getShareTarget } from "./share";

describe("share", () => {
  it("returns public /e/<slug> URL for public events", () => {
    const target = getShareTarget(
      {
        is_public: true,
        slug: "ola-and-adesola-2026",
        title: "Ọlá & Adéṣọlá",
      },
      "https://ariya.ng"
    );

    expect(target).toEqual({
      path: "/e/ola-and-adesola-2026",
      url: "https://ariya.ng/e/ola-and-adesola-2026",
      title: "Ọlá & Adéṣọlá",
    });
  });

  it("returns null for private events or missing slug (never a dashboard URL)", () => {
    expect(
      getShareTarget(
        {
          is_public: false,
          slug: "ola-and-adesola-2026",
          title: "Ọlá & Adéṣọlá",
        },
        "https://ariya.ng"
      )
    ).toBeNull();

    expect(
      getShareTarget(
        {
          is_public: true,
          slug: "   ",
          title: "Ọlá & Adéṣọlá",
        },
        "https://ariya.ng"
      )
    ).toBeNull();
  });
});
