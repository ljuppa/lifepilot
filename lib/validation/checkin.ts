import { z } from "zod";

export const CheckinSchema = z.object({
  mood: z.number().int().min(1).max(5),
  health_metric: z.number().positive().optional(),
  finance_metric: z.number().min(0).optional(),
  wellness_metric: z.number().min(0).max(24).optional(),
  note: z.string().max(80).optional(),
  checked_in_at: z.string().datetime().optional(),
});

export type CheckinInput = z.infer<typeof CheckinSchema>;
