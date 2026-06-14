import { z } from "zod";

export const AdminUserLookupSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
});

export type AdminUserLookupInput = z.infer<typeof AdminUserLookupSchema>;

export const AdminBroadcastSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(120, "Subject must be 120 characters or fewer"),
  body: z.string().min(1, "Body is required").max(2000, "Body must be 2,000 characters or fewer"),
});

export type AdminBroadcastInput = z.infer<typeof AdminBroadcastSchema>;
