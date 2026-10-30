import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Passcode is required"),
  rememberMe: z.boolean().default(true),
  next: z.string().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full legal name must be at least 2 characters"),
    email: z.string().trim().email("Please enter a valid email address"),
    role: z.enum(["couple", "planner"]).default("couple"),
    password: z
      .string()
      .min(8, "Passcode must be at least 8 characters")
      .regex(/\d/, "Passcode must contain at least 1 number")
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        "Passcode must contain at least 1 special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your passcode"),
    agreeTerms: z.literal(true, {
      error: "You must agree to the terms and privacy policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passcodes do not match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Passcode must be at least 8 characters")
      .regex(/\d/, "Passcode must contain at least 1 number")
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        "Passcode must contain at least 1 special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your passcode"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passcodes do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
