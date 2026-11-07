import { describe, expect, it } from "vitest";
import {
  googleSignInEnabled,
  oauthCallbackUrl,
  oauthFailureMessage,
} from "./oauth";

describe("Google sign-in helpers", () => {
  it("returns to this app's callback and keeps a safe next path", () => {
    expect(oauthCallbackUrl("https://ariyaday.com")).toBe(
      "https://ariyaday.com/auth/callback"
    );
    expect(oauthCallbackUrl("https://ariyaday.com", "/events/abc/guests")).toBe(
      "https://ariyaday.com/auth/callback?next=%2Fevents%2Fabc%2Fguests"
    );
  });

  it("never carries a next path that leaves the app", () => {
    for (const evil of [
      "https://evil.example",
      "//evil.example",
      "javascript:1",
    ]) {
      expect(oauthCallbackUrl("https://ariyaday.com", evil)).toBe(
        "https://ariyaday.com/auth/callback"
      );
    }
  });

  it("explains a cancelled or failed sign-in in plain words", () => {
    expect(oauthFailureMessage("oauth_cancelled")).toMatch(/cancelled/i);
    expect(oauthFailureMessage("oauth_failed")).toMatch(/could not finish/i);
    expect(oauthFailureMessage("auth_callback_failed")).toBeNull();
    expect(oauthFailureMessage(null)).toBeNull();
  });

  it("shows the button only when the flag is exactly true", () => {
    expect(googleSignInEnabled("true")).toBe(true);
    for (const off of [undefined, "", "false", "1", "TRUE"]) {
      expect(googleSignInEnabled(off)).toBe(false);
    }
  });
});
