import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { getResendClient } from "@/lib/email/resend";
import { buildDataExportEmail } from "@/lib/email/templates/dataExport";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lifepilot.app";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "briefing@lifepilot.app";

export const exportUserData = inngest.createFunction(
  {
    id: "export-user-data",
    name: "Export User Data",
    retries: 3,
    triggers: [{ event: "export/data.requested" }],
  },
  async ({ event, step }) => {
    const userId = event.data.userId as string;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `exports/${userId}/${timestamp}.json`;

    const { jsonString } = await step.run("fetch-user-data", async () => {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const [profileRes, goalsRes, checkinsRes, briefingsRes, auditRes] = await Promise.all([
        adminClient.from("profiles").select("*").eq("id", userId).single(),
        adminClient.from("goals").select("*").eq("user_id", userId),
        adminClient.from("checkins").select("*").eq("user_id", userId).order("checked_in_at", { ascending: false }),
        adminClient.from("briefings").select("*").eq("user_id", userId).order("briefing_date", { ascending: false }),
        adminClient.from("audit_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        profile: profileRes.data,
        goals: goalsRes.data ?? [],
        checkins: checkinsRes.data ?? [],
        briefings: briefingsRes.data ?? [],
        auditLog: auditRes.data ?? [],
      };
      return { jsonString: JSON.stringify(exportPayload, null, 2) };
    });

    await step.run("upload-export", async () => {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { error } = await adminClient.storage
        .from("exports")
        .upload(path, Buffer.from(jsonString), { contentType: "application/json", upsert: true });
      if (error) throw new Error(`Storage upload failed: ${error.message}`);
    });

    await step.run("send-email", async () => {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const resend = getResendClient();

      const { data: authUser } = await adminClient.auth.admin
        .getUserById(userId)
        .catch(() => ({ data: null }));

      type AuthUserData = { user?: { email?: string; user_metadata?: { name?: string } } } | null;
      const typedAuthUser = authUser as AuthUserData;
      const userEmail = typedAuthUser?.user?.email;
      const userName = typedAuthUser?.user?.user_metadata?.name ?? "there";

      if (!userEmail) {
        console.error(JSON.stringify({ event: "data_export_email_failed", userId, code: "NO_EMAIL" }));
        return;
      }

      const { data: signedData, error: signedError } = await adminClient.storage
        .from("exports")
        .createSignedUrl(path, 3600);

      if (signedError || !signedData?.signedUrl) {
        console.error(JSON.stringify({ event: "data_export_email_failed", userId, code: "SIGNED_URL_FAILED" }));
        return;
      }

      const { subject, html, text } = buildDataExportEmail({
        userName,
        downloadUrl: signedData.signedUrl,
        appBaseUrl: APP_BASE_URL,
      });

      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: userEmail,
        subject,
        html,
        text,
      });

      if (sendError) {
        console.error(
          JSON.stringify({
            event: "data_export_email_failed",
            userId,
            code: (sendError as { name?: string }).name ?? "UNKNOWN",
          })
        );
      } else {
        console.log(
          JSON.stringify({
            event: "data_export_generated",
            userId,
            fileSizeBytes: Buffer.byteLength(jsonString),
          })
        );
      }
    });

    return { path };
  }
);
