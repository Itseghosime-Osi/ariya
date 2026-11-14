import { describe, expect, it } from "vitest";
import { isSoftwareRenderer } from "./scene-host";

describe("isSoftwareRenderer", () => {
  it("recognises the CPU renderers that stall a page", () => {
    for (const name of [
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
      "llvmpipe (LLVM 15.0.7, 256 bits)",
      "Microsoft Basic Render Driver",
      "Mesa Software Rasterizer",
    ])
      expect(isSoftwareRenderer(name)).toBe(true);
  });

  it("leaves real GPUs alone", () => {
    for (const name of [
      "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)",
      "Mali-G78",
      "Adreno (TM) 640",
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)",
      "",
    ])
      expect(isSoftwareRenderer(name)).toBe(false);
  });
});

import { lowEndReason } from "./scene-host";

describe("lowEndReason", () => {
  it("keeps the hall off phones with very little memory", () => {
    expect(lowEndReason({ memoryGb: 2, cores: 8 })).toBe("memory");
    expect(lowEndReason({ memoryGb: 1 })).toBe("memory");
  });

  it("keeps it off small, few-core phones", () => {
    expect(lowEndReason({ memoryGb: 4, cores: 4 })).toBe("cpu");
  });

  it("keeps it off entry-level mobile GPUs", () => {
    for (const renderer of [
      "Mali-G52 MC2",
      "Mali-T830",
      "Mali-400 MP",
      "PowerVR Rogue GE8320",
      "Adreno (TM) 506",
      "Adreno (TM) 610",
    ])
      expect(lowEndReason({ memoryGb: 8, cores: 8, renderer })).toBe("gpu");
  });

  it("lets capable phones and desktops try the hall", () => {
    expect(
      lowEndReason({ memoryGb: 8, cores: 8, renderer: "Adreno (TM) 740" })
    ).toBeNull();
    expect(
      lowEndReason({ memoryGb: 6, cores: 8, renderer: "Mali-G715" })
    ).toBeNull();
    expect(
      lowEndReason({ memoryGb: 8, cores: 10, renderer: "Apple M2" })
    ).toBeNull();
    // Browsers that do not report memory or cores are not penalised for it.
    expect(lowEndReason({ renderer: "Apple GPU" })).toBeNull();
  });
});
