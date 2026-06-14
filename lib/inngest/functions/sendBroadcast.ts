import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { getResendClient } from "@/lib/email/resend";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe";
import { buildBroadcastEmail } from "@/lib/email/templates/broadcast";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lifepilot.app";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "briefing@lifepilot.app";
const PAGE_SIZE = 1000;
const BATCH_SIZE = 100;

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

      // D2: collect user IDs that have at least one goal (goals-existence proxy for "complete profile")
      const goalUserIds = new Set<string>();
      let goalFrom = 0;
      while (true) {
        const { data: goalRows, error: goalError } = await adminClient
          .from("goals")
          .select("user_id")
          .range(goalFrom, goalFrom + PAGE_SIZE - 1);
        if (goalError) throw new Error(`Goals fetch failed: ${goalError.message}`);
        if (!goalRows || goalRows.length === 0) break;
        for (const row of goalRows) goalUserIds.add(row.user_id as string);
        if (goalRows.length < PAGE_SIZE) break;
        goalFrom += PAGE_SIZE;
      }

      // D1: paginate profiles to handle > 1,000 opted-in users
      const allProfiles: { id: string }[] = [];
      let profileFrom = 0;
      while (true) {
        const { data: profiles, error } = await adminClient
          .from("profiles")
          .select("id")
          .filter("notification_preferences->broadcastEmails", "eq", true)
          .range(profileFrom, profileFrom + PAGE_SIZE - 1);
        if (error) throw new Error(`Profiles fetch failed: ${error.message}`);
        if (!profiles || profiles.length === 0) break;
        for (const p of profiles) {
          if (goalUserIds.has(p.id)) allProfiles.push(p);
        }
        if (profiles.length < PAGE_SIZE) break;
        profileFrom += PAGE_SIZE;
      }

      return allProfiles;
    });

    // D1: batch sends to stay within Inngest's ~1,000-step ceiling
    const batches: { id: string }[][] = [];
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      batches.push(recipients.slice(i, i + BATCH_SIZE));
    }

    await Promise.all(
      batches.map((batch, batchIndex) =>
        step.run(`send-broadcast-batch-${batchIndex}`, async () => {
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          const resend = getResendClient();

          for (const profile of batch) {
            const authResult = await adminClient.auth.admin
              .getUserById(profile.id)
              .catch(() => ({ data: null }));
            const typedUser = (
              authResult as {
                data: { user?: { email?: string; email_confirmed_at?: string | null } } | null;
              }
            )?.data?.user;
            const userEmail = typedUser?.email;
            const emailConfirmedAt = typedUser?.email_confirmed_at;

            if (!userEmail || !emailConfirmedAt) {
              // P5: log skipped recipients so they are visible in observability tooling
              console.log(
                JSON.stringify({
                  event: "broadcast_recipient_skipped",
                  userId: profile.id,
                  reason: !userEmail ? "no_email" : "unconfirmed_email",
                })
              );
              continue;
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
          }
        })
      )
    );

    // P3: durable audit log inside step.run so it retries on failure; P2: log errors
    await step.run("write-audit-log", async () => {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { error } = await adminClient.from("audit_logs").insert({
        user_id: adminUserId,
        event_type: "admin_broadcast_sent",
        metadata: { subject, recipientCount: recipients.length },
      });
      if (error) {
        console.error(JSON.stringify({ event: "audit_log_error", code: error.code }));
      }
    });

    return { recipientCount: recipients.length };
  }
);
