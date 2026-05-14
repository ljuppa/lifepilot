import { z } from "zod";

export const ProfileStep1Schema = z.object({
  name: z.string().min(1, "Please enter your name."),
  age: z.coerce.number().int().min(18, "You must be 18 or older.").max(120),
  gender: z.string().optional(),
  height: z.coerce.number().positive().optional().or(z.literal("")),
  weight: z.coerce.number().positive().optional().or(z.literal("")),
  location: z.string().optional(),
});

export const ProfileStep2Schema = z.object({
  monthly_income: z.coerce.number().min(0).optional().or(z.literal("")),
  fixed_expenses: z.coerce.number().min(0).optional().or(z.literal("")),
  discretionary_budget: z.coerce.number().min(0).optional().or(z.literal("")),
});

export const GoalInputSchema = z.object({
  domain: z.enum(["health", "finance", "wellness"], {
    error: "Please select a domain.",
  }),
  title: z.string().min(1, "Please enter a goal title."),
});

export const ProfileStep3Schema = z.object({
  goals: z
    .array(GoalInputSchema)
    .min(1, "Please select at least one goal domain.")
    .max(3),
});

export const ProfileStep4Schema = z.object({
  briefing_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Please enter a valid time."),
  timezone: z.string().min(1, "Please select your timezone."),
});

export const ProfileConsentSchema = z.object({
  consent: z.literal(true, {
    error: "You must agree to the data processing terms to continue.",
  }),
});

export const ProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.coerce.number().int().min(18).max(120).optional(),
  gender: z.string().optional(),
  height: z.coerce.number().positive().optional().nullable(),
  weight: z.coerce.number().positive().optional().nullable(),
  location: z.string().optional(),
  monthly_income: z.coerce.number().min(0).optional().nullable(),
  fixed_expenses: z.coerce.number().min(0).optional().nullable(),
  discretionary_budget: z.coerce.number().min(0).optional().nullable(),
  briefing_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().optional(),
});

export type ProfileStep1Input = z.infer<typeof ProfileStep1Schema>;
export type ProfileStep2Input = z.infer<typeof ProfileStep2Schema>;
export type ProfileStep3Input = z.infer<typeof ProfileStep3Schema>;
export type ProfileStep4Input = z.infer<typeof ProfileStep4Schema>;
export type GoalInput = z.infer<typeof GoalInputSchema>;
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
