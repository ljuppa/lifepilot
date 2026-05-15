import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { getResendClient } from "@/lib/email/resend";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lifepilot.app";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "briefing@lifepilot.app";

export function buildReengagementEmail(firstName: string, appUrl: string, unsubscribeUrl?: string) {
  const unsubscribeHtml = unsubscribeUrl
    ? `<p style="font-size:12px;color:#666;margin-top:24px;">Don't want these emails? <a href="${unsubscribeUrl}">Unsubscribe</a></p>`
    : "";
  const unsubscribeText = unsubscribeUrl ? `\n\nTo unsubscribe: ${unsubscribeUrl}` : "";
  return {
    subject: `Your streak is waiting, ${firstName}`,
    html: `
      <p>Hi ${firstName},</p>
      <p>We noticed you haven't checked in for a few days. Your goals are still here, waiting for you.</p>
      <p>Even a quick check-in helps you stay on track. It only takes a minute.</p>
      <p><a href="${appUrl}/checkin">Check in now &rarr;</a></p>
      <p>— Your LifePilot coach</p>
      ${unsubscribeHtml}
    `,
    text: `Hi ${firstName},\n\nWe noticed you haven't checked in for a few days. Your goals are still here, waiting for you.\n\nEven a quick check-in helps you stay on track. It only takes a minute.\n\nCheck in now: ${appUrl}/checkin\n\n— Your LifePilot coach${unsubscribeText}`,
  };
}

export const checkInactivity = inngest.createFunction(
  { id: "check-inactivity", name: "Check Inactivity Daily", retries: 3, triggers: [{ cron: "0 9 * * *" }] },
  async ({ step }) => {
    const usersToContact = await step.run("find-inactive-users", async () => {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const threeDaysAgo = new Date();
      threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);

      const { data: profiles, error } = await adminClient
        .from("profiles")
        .select("id, name, last_reengagement_sent_at, notification_preferences")
        .filter("notification_preferences->reengagementEmails", "eq", true)
        .or(
          `last_reengagement_sent_at.is.null,last_reengagement_sent_at.lt.${threeDaysAgo.toISOString()}`
        );

      if (error) throw new Error(`Profiles fetch failed: ${error.message}`);

      const inactive: typeof profiles = [];
      for (const profile of profiles ?? []) {
        const { data: recentCheckin } = await adminClient
          .from("checkins")
          .select("id")
          .eq("user_id", profile.id)
          .gte("checked_in_at", threeDaysAgo.toISOString())
          .limit(1)
          .maybeSingle();

        if (!recentCheckin) {
          inactive.push(profile);
        }
      }
      return inactive;
    });

    await Promise.all(
      (usersToContact ?? []).map((user) =>
        step.run(`send-reengagement-${user.id}`, async () => {
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          const resend = getResendClient();

          const authResult = await adminClient.auth.admin.getUserById(user.id).catch(() => ({ data: null }));
          const userEmail = (authResult as { data: { user?: { email?: string } } | null })?.data?.user?.email;

          if (!userEmail) {
            console.error(JSON.stringify({ event: "reengagement_send_failed", userId: user.id, code: "NO_EMAIL" }));
            return;
          }

          const firstName = (user.name as string | null) ?? "there";
          const unsubToken = generateUnsubscribeToken(user.id, "reengagementEmails");
          const unsubscribeUrl = `${APP_BASE_URL}/api/unsubscribe?token=${unsubToken}&userId=${user.id}&type=reengagementEmails`;
          const { subject, html, text } = buildReengagementEmail(firstName, APP_BASE_URL, unsubscribeUrl);

          const { error: sendError } = await resend.emails.send({
            from: FROM_EMAIL,
            to: userEmail,
            subject,
            html,
            text,
          });

          if (sendError) {
            console.error(JSON.stringify({ event: "reengagement_send_failed", userId: user.id, code: (sendError as { name?: string }).name ?? "UNKNOWN" }));
          } else {
            await adminClient
              .from("profiles")
              .update({ last_reengagement_sent_at: new Date().toISOString() })
              .eq("id", user.id);
            console.log(JSON.stringify({ event: "reengagement_sent", userId: user.id }));
          }
        })
      )
    );

    return { contacted: (usersToContact ?? []).length };
  }
);
