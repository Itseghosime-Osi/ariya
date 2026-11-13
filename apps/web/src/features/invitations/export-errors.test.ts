import { describe, expect, it } from "vitest";
import { describeExportFailure } from "./export-errors";

describe("describeExportFailure", () => {
  it("keeps messages that already say what to do next", () => {
    const m =
      "A picture could not be loaded for export. Replace it or try again; no incomplete file was downloaded.";
    expect(describeExportFailure(new Error(m))).toBe(m);
    expect(describeExportFailure(m)).toBe(m);
  });

  it("replaces a raw browser error with a plain next step", () => {
    const out = describeExportFailure(
      new Error("Failed to execute 'toBlob' on 'HTMLCanvasElement'")
    );
    expect(out).toMatch(/try again/i);
    expect(out).toMatch(/another format/i);
    expect(out).not.toMatch(/toBlob/);
  });

  it("handles an empty or non-error value", () => {
    expect(describeExportFailure(undefined)).toMatch(/try again/i);
    expect(describeExportFailure("")).toMatch(/try again/i);
  });
});
