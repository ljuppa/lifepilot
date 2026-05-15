import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { generateBriefing } from "@/lib/inngest/functions/generateBriefing";
import { retentionCleanup } from "@/lib/inngest/functions/retentionCleanup";
import { checkInactivity } from "@/lib/inngest/functions/checkInactivity";
import { exportUserData } from "@/lib/inngest/functions/exportUserData";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBriefing, retentionCleanup, checkInactivity, exportUserData],
});
