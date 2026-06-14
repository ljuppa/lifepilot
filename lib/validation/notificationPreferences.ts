import { z } from "zod";

export const NotificationPreferencesSchema = z
  .object({
    briefingEmails: z.boolean().optional(),
    reengagementEmails: z.boolean().optional(),
    broadcastEmails: z.boolean().optional(),
  })
  .refine(
    (v) => v.briefingEmails !== undefined || v.reengagementEmails !== undefined || v.broadcastEmails !== undefined,
    { message: "At least one preference key must be provided." }
  );
