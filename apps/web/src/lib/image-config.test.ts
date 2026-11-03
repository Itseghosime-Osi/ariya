import { describe, it, expect } from "vitest";
import {
  shouldAllowLocalIP,
  getDangerouslyAllowLocalIP,
} from "../../next.config";

describe("next.config image helper (shouldAllowLocalIP)", () => {
  it("returns true for a local URL (localhost, 127.0.0.1, ::1)", () => {
    expect(shouldAllowLocalIP("http://localhost:54321")).toBe(true);
    expect(shouldAllowLocalIP("http://127.0.0.1:57321")).toBe(true);
    expect(shouldAllowLocalIP("http://[::1]:54321")).toBe(true);
    expect(shouldAllowLocalIP("http://localhost:3000")).toBe(true);
  });

  it("returns undefined for hosted Supabase URLs", () => {
    expect(
      shouldAllowLocalIP("https://zdywuvirwltshlwpxqtz.supabase.co")
    ).toBeUndefined();
    expect(
      shouldAllowLocalIP("https://example-ref.supabase.co")
    ).toBeUndefined();
  });

  it("returns undefined for non-local hosts and invalid URLs", () => {
    expect(shouldAllowLocalIP("https://example.com")).toBeUndefined();
    expect(shouldAllowLocalIP("http://192.168.1.100:54321")).toBeUndefined();
    expect(shouldAllowLocalIP("")).toBeUndefined();
    expect(shouldAllowLocalIP("not-a-valid-url")).toBeUndefined();
    expect(shouldAllowLocalIP(undefined)).toBeUndefined();
  });

  it("exports getDangerouslyAllowLocalIP as an alias", () => {
    expect(getDangerouslyAllowLocalIP("http://127.0.0.1:57321")).toBe(true);
    expect(
      getDangerouslyAllowLocalIP("https://example.supabase.co")
    ).toBeUndefined();
  });
});
