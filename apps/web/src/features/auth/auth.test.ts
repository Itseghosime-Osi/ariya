import { describe, expect, it } from "vitest";
import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./schemas";

describe("Auth Schemas", () => {
  describe("signInSchema", () => {
    it("accepts valid sign-in credentials", () => {
      const valid = signInSchema.safeParse({
        email: "planner@ariya.ng",
        password: "Passcode123!",
        rememberMe: true,
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid email addresses", () => {
      const invalid = signInSchema.safeParse({
        email: "not-an-email",
        password: "Passcode123!",
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects empty password", () => {
      const invalid = signInSchema.safeParse({
        email: "planner@ariya.ng",
        password: "",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("signUpSchema", () => {
    it("accepts valid registration input", () => {
      const valid = signUpSchema.safeParse({
        fullName: "Chidinma Adeleke",
        email: "chidinma@example.com",
        role: "couple",
        password: "ValidPasscode1#",
        confirmPassword: "ValidPasscode1#",
        agreeTerms: true,
      });
      expect(valid.success).toBe(true);
    });

    it("rejects mismatched passwords", () => {
      const invalid = signUpSchema.safeParse({
        fullName: "Chidinma Adeleke",
        email: "chidinma@example.com",
        role: "couple",
        password: "ValidPasscode1#",
        confirmPassword: "DifferentPasscode2@",
        agreeTerms: true,
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0]?.message).toBe("Passcodes do not match");
      }
    });

    it("rejects weak password lacking special character", () => {
      const invalid = signUpSchema.safeParse({
        fullName: "Chidinma Adeleke",
        email: "chidinma@example.com",
        role: "couple",
        password: "PasswordWithoutSpecial1",
        confirmPassword: "PasswordWithoutSpecial1",
        agreeTerms: true,
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects when terms are not agreed to", () => {
      const invalid = signUpSchema.safeParse({
        fullName: "Chidinma Adeleke",
        email: "chidinma@example.com",
        role: "couple",
        password: "ValidPasscode1#",
        confirmPassword: "ValidPasscode1#",
        agreeTerms: false,
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("accepts valid email for recovery", () => {
      const valid = forgotPasswordSchema.safeParse({
        email: "recovery@ariya.ng",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects malformed email for recovery", () => {
      const invalid = forgotPasswordSchema.safeParse({
        email: "not-an-email",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts matching strong new password", () => {
      const valid = resetPasswordSchema.safeParse({
        password: "NewPasscode2026$",
        confirmPassword: "NewPasscode2026$",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects non-matching new password", () => {
      const invalid = resetPasswordSchema.safeParse({
        password: "NewPasscode2026$",
        confirmPassword: "MismatchPasscode!",
      });
      expect(invalid.success).toBe(false);
    });
  });
});
