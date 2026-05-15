import { z } from "zod";

export const GoalInputSchema = z.object({
  domain: z.enum(["health", "finance", "wellness"], {
    error: "Please select a domain.",
  }),
  title: z.string().min(1, "Please enter a goal title."),
});

export type GoalInput = z.infer<typeof GoalInputSchema>;
