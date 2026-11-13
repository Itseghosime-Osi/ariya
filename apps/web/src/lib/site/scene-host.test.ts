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
