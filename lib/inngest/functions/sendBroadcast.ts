import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { getResendClient } from "@/lib/email/resend";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe";
import { buildBroadcastEmail } from "@/lib/email/templates/broadcast";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lifepilot.app";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "briefing@lifepilot.app";

export const sendBroadcast = inngest.createFunction(
  { id: "send-broadcast", name: "Send System-Wide Broadcast", retries: 3 },
  { event: "notification/broadcast.requested" },
  async ({ event, step }) => {
    const { adminUserId, subject, body } = event.data;

    const recipients = await step.run("find-recipients", async () => {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: profiles, error } = await adminClient
        .from("profiles")
        .select("id")
        .filter("notification_preferences->broadcastEmails", "eq", true);

      if (error) throw new Error(`Profiles fetch failed: ${error.message}`);
      return profiles ?? [];
    });

    await Promise.all(
      recipients.map((profile: { id: string }) =>
        step.run(`send-broadcast-${profile.id}`, async () => {
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          const resend = getResendClient();

          const authResult = await adminClient.auth.admin.getUserById(profile.id).catch(() => ({ data: null }));
          const typedUser = (authResult as { data: { user?: { email?: string; email_confirmed_at?: string | null } } | null })?.data?.user;
          const userEmail = typedUser?.email;
          const emailConfirmedAt = typedUser?.email_confirmed_at;

          if (!userEmail || !emailConfirmedAt) {
            return;
          }

          const unsubToken = generateUnsubscribeToken(profile.id, "broadcastEmails");
          const unsubscribeUrl = `${APP_BASE_URL}/api/unsubscribe?token=${unsubToken}&userId=${profile.id}&type=broadcastEmails`;
          const { subject: emailSubject, html, text } = buildBroadcastEmail(subject, body, unsubscribeUrl);

          const { error: sendError } = await resend.emails.send({
            from: FROM_EMAIL,
            to: userEmail,
            subject: emailSubject,
            html,
            text,
          });

          if (sendError) {
            console.error(
              JSON.stringify({
                event: "broadcast_send_failed",
                userId: profile.id,
                code: (sendError as { name?: string }).name ?? "UNKNOWN",
              })
            );
          } else {
            console.log(JSON.stringify({ event: "broadcast_sent", userId: profile.id }));
          }
        })
      )
    );

    createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      .from("audit_logs")
      .insert({ user_id: adminUserId, event_type: "admin_broadcast_sent", metadata: { subject, recipientCount: recipients.length } })
      .then(() => {})
      .catch(() => {});

    return { recipientCount: recipients.length };
  }
);
