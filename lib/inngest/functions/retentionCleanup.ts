import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { inngest } from "../client";

export const retentionCleanup = inngest.createFunction(
  { id: "retention-cleanup", retries: 3, triggers: [{ cron: "0 2 * * *" }] },
  async ({ step }) => {
    const ranAt = new Date().toISOString();

    const { checkinsDeleted, briefingsDeleted } = await step.run("delete-stale-data", async () => {
      // Service-role client bypasses RLS for cross-user retention
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [checkinsRes, briefingsRes] = await Promise.all([
        adminClient
          .from("checkins")
          .delete()
          .lt("checked_in_at", twelveMonthsAgo.toISOString())
          .select("id"),
        adminClient
          .from("briefings")
          .delete()
          .lt("briefing_date", sixMonthsAgo.toISOString().split("T")[0])
          .select("id"),
      ]);

      return {
        checkinsDeleted: checkinsRes.data?.length ?? 0,
        briefingsDeleted: briefingsRes.data?.length ?? 0,
      };
    });

    console.log(JSON.stringify({ event: "retention_cleanup_complete", checkinsDeleted, briefingsDeleted, ranAt }));
    return { checkinsDeleted, briefingsDeleted, ranAt };
  }
);
