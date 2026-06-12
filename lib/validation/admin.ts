import { z } from "zod";

export const AdminUserLookupSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
});

export type AdminUserLookupInput = z.infer<typeof AdminUserLookupSchema>;
