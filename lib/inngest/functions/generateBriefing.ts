import { inngest } from "../client";
import { createClient } from "@/utils/supabase/server";
import { getAnthropicClient } from "@/lib/claude/client";
import { buildBriefingPrompt } from "@/lib/claude/prompts";
import { filterLlmOutput } from "@/lib/claude/safety";
import { getResendClient } from "@/lib/email/resend";
import { buildBriefingEmail } from "@/lib/email/templates/briefing";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe";

const CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001";
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lifepilot.app";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "briefing@lifepilot.app";

interface BriefingContent {
  greeting: string;
  suggestions: Array<{
    domain: string;
    title: string;
    body: string;
    action_link_text?: string | null;
    action_link_url?: string | null;
  }>;
  observation?: string | null;
}

export const generateBriefing = inngest.createFunction(
  { id: "generate-briefing", retries: 3, triggers: [{ event: "briefing/generate.requested" }] },
  async ({ event, step }) => {
    const userId = event.data.userId as string;

    const context = await step.run("fetch-context", async () => {
      const supabase = await createClient();

      const [profileRes, goalsRes, checkinsRes] = await Promise.all([
        supabase.from("profiles").select("name, age, timezone, briefing_time").eq("user_id", userId).single(),
        supabase.from("goals").select("domain, title").eq("user_id", userId).eq("status", "active"),
        supabase
          .from("checkins")
          .select("mood, health_metric, finance_metric, wellness_metric, note, checked_in_at")
          .eq("user_id", userId)
          .order("checked_in_at", { ascending: false })
          .limit(7),
      ]);

      if (profileRes.error) throw new Error(`Profile fetch failed: ${profileRes.error.message}`);
      if (goalsRes.error) throw new Error(`Goals fetch failed: ${goalsRes.error.message}`);

      return {
        profile: profileRes.data,
        goals: goalsRes.data ?? [],
        checkins: checkinsRes.data ?? [],
      };
    });

    if (context.goals.length === 0) {
      console.log(JSON.stringify({ event: "briefing_skipped_no_goals", userId }));
      return { skipped: true };
    }

    const today = new Date().toISOString().split("T")[0];
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

    const llmContent = await step.run("call-claude", async () => {
      const client = getAnthropicClient();
      const prompt = buildBriefingPrompt({
        profile: context.profile,
        goals: context.goals,
        checkins: context.checkins,
        today,
        dayOfWeek,
      });

      const response = await client.messages.create({
        model: CLAUDE_HAIKU_MODEL,
        max_tokens: 1024,
        system: prompt.system,
        messages: prompt.messages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") throw new Error("No text block in Claude response");
      return textBlock.text;
    });

    const filtered = await step.run("filter-output", async () => {
      return filterLlmOutput(llmContent);
    });

    let parsedContent: BriefingContent;
    try {
      parsedContent = JSON.parse(filtered.content) as BriefingContent;
    } catch {
      // If safety filter triggered and replaced with fallback string, wrap it
      parsedContent = {
        greeting: "Here's your daily briefing.",
        suggestions: context.goals.map((g: { domain: string; title: string }) => ({
          domain: g.domain,
          title: filtered.content,
          body: filtered.content,
        })),
      };
    }

    // Apply safety filter per suggestion body if filter was triggered
    if (filtered.triggered && parsedContent.suggestions) {
      parsedContent.suggestions = parsedContent.suggestions.map((s) => ({
        ...s,
        body: filtered.content,
      }));
    }

    const briefingId = await step.run("store-briefing", async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("briefings")
        .insert({
          user_id: userId,
          content: parsedContent,
          briefing_date: today,
          email_status: "pending",
          safety_filter_triggered: filtered.triggered,
        })
        .select("id")
        .single();

      if (error) throw new Error(`Briefing insert failed: ${error.message}`);
      console.log(JSON.stringify({ event: "briefing_generated", userId, briefingDate: today }));
      return data.id as string;
    });

    await step.run("send-email", async () => {
      const supabase = await createClient();
      const resend = getResendClient();

      const { data: authUser } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: null }));
      const userEmail = (authUser as { user?: { email?: string } } | null)?.user?.email;
      if (!userEmail) {
        console.error(JSON.stringify({ event: "email_delivery_failed", userId, code: "NO_EMAIL" }));
        await supabase.from("briefings").update({ email_status: "failed" }).eq("id", briefingId);
        return;
      }

      const emailCtx = {
        userName: context.profile.name ?? "there",
        userEmail,
        dayOfWeek,
        greeting: parsedContent.greeting,
        suggestions: parsedContent.suggestions,
        appBaseUrl: APP_BASE_URL,
      };

      const unsubToken = generateUnsubscribeToken(userId, "briefingEmails");
      const unsubscribeUrl = `${APP_BASE_URL}/api/unsubscribe?token=${unsubToken}&userId=${userId}&type=briefingEmails`;
      const { subject, html, text } = buildBriefingEmail(emailCtx, unsubscribeUrl);

      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: userEmail,
        subject,
        html,
        text,
      });

      if (sendError) {
        console.error(JSON.stringify({ event: "email_delivery_failed", userId, code: sendError.name }));
        await supabase.from("briefings").update({ email_status: "failed" }).eq("id", briefingId);
      } else {
        await supabase.from("briefings").update({ email_status: "delivered" }).eq("id", briefingId);
      }
    });

    return { briefingId };
  }
);
