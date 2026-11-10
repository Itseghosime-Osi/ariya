// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { clipRoundedBackgrounds } from "./export-service";

/** jsdom does not model clip-path or background corners, so feed it the computed values. */
function fakeComputed(values: Map<Element, Partial<Record<string, string>>>) {
  vi.spyOn(window, "getComputedStyle").mockImplementation(
    (el: Element) =>
      ({
        backgroundImage: "none",
        clipPath: "none",
        borderTopLeftRadius: "0px",
        borderTopRightRadius: "0px",
        borderBottomRightRadius: "0px",
        borderBottomLeftRadius: "0px",
        ...values.get(el),
      }) as CSSStyleDeclaration
  );
}

function recorded(el: HTMLElement) {
  const sets: string[] = [];
  Object.defineProperty(el.style, "clipPath", {
    set: (value: string) => sets.push(value),
    get: () => sets.at(-1) ?? "",
  });
  return sets;
}

describe("rounded backgrounds in exports", () => {
  afterEach(() => vi.restoreAllMocks());

  it("clips a rounded picture to the same corners, which WebKit's SVG rendering otherwise squares off", () => {
    const root = document.createElement("div");
    const picture = document.createElement("div");
    root.appendChild(picture);
    const sets = recorded(picture);
    fakeComputed(
      new Map([
        [
          picture,
          {
            backgroundImage: 'url("data:image/png;base64,AAAA")',
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "8px",
            borderBottomRightRadius: "4px",
            borderBottomLeftRadius: "0px",
          },
        ],
      ])
    );
    clipRoundedBackgrounds(root);
    expect(sets).toEqual(["inset(0 round 12px 8px 4px 0px)"]);
  });

  it("leaves square pictures, plain colours and existing clips alone", () => {
    const root = document.createElement("div");
    const square = document.createElement("div");
    const colour = document.createElement("div");
    const clipped = document.createElement("div");
    root.append(square, colour, clipped);
    const sets = [square, colour, clipped].map(recorded);
    fakeComputed(
      new Map([
        [square, { backgroundImage: 'url("data:image/png;base64,AAAA")' }],
        [colour, { borderTopLeftRadius: "50%" }],
        [
          clipped,
          {
            backgroundImage: 'url("data:image/png;base64,AAAA")',
            borderTopLeftRadius: "50%",
            clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
          },
        ],
      ])
    );
    clipRoundedBackgrounds(root);
    expect(sets.flat()).toEqual([]);
  });
});
