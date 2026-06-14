import { z } from "zod";

export const GoalInputSchema = z.object({
  domain: z.enum(["health", "finance", "wellness"], {
    error: "Please select a domain.",
  }),
  title: z.string().min(1, "Please enter a goal title."),
  target_value: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().positive("Target must be a positive number.").optional()
  ),
});

export type GoalInput = z.infer<typeof GoalInputSchema>;
