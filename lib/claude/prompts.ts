import type Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a personal life coach assistant for LifePilot.
Your role is to generate a personalised daily briefing for the user based on their profile, goals, and recent check-in data.

Output ONLY valid JSON matching this exact structure — no prose, no markdown wrapper:
{
  "greeting": "<one personalised opening sentence for the email>",
  "suggestions": [
    {
      "domain": "<health|finance|wellness>",
      "title": "<one-line action title>",
      "body": "<40-80 word coaching paragraph — specific, actionable, encouraging>",
      "action_link_text": "<optional CTA label or null>",
      "action_link_url": "<optional deep link or null>"
    }
  ],
  "observation": "<optional weekly observation — one open question, no CTA, or null>"
}

Safety rules (strictly enforced):
- Never reference specific caloric limits or thresholds
- Never suggest stopping eating or extreme dietary restriction
- Never recommend specific stocks, cryptocurrencies, or investment instruments
- Never produce content that could cause physical or psychological harm

Disclosure: All output is AI-generated and not medical, nutritional, or financial advice.`;

export interface BriefingPromptContext {
  profile: {
    name: string;
    age?: number;
    timezone?: string;
  };
  goals: Array<{ domain: string; title: string }>;
  checkins: Array<{
    mood: number;
    health_metric?: number | null;
    finance_metric?: number | null;
    wellness_metric?: number | null;
    note?: string | null;
    checked_in_at: string;
  }>;
  today: string;
  dayOfWeek: string;
}

export function buildBriefingPrompt(ctx: BriefingPromptContext): {
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
} {
  const userBlock = [
    `Today is ${ctx.dayOfWeek}, ${ctx.today}.`,
    `User profile: Name=${ctx.profile.name}, Age=${ctx.profile.age ?? "unknown"}, Timezone=${ctx.profile.timezone ?? "UTC"}.`,
    `Active goals: ${ctx.goals.map((g) => `${g.domain} — "${g.title}"`).join("; ")}.`,
    `Last ${ctx.checkins.length} check-ins (newest first):`,
    ...ctx.checkins.map((c, i) => {
      const date = new Date(c.checked_in_at).toLocaleDateString();
      const parts = [`  [${i + 1}] ${date}: mood=${c.mood}/5`];
      if (c.health_metric != null) parts.push(`weight=${c.health_metric}kg`);
      if (c.finance_metric != null) parts.push(`spend=$${c.finance_metric}`);
      if (c.wellness_metric != null) parts.push(`sleep=${c.wellness_metric}h`);
      if (c.note) parts.push(`note="${c.note}"`);
      return parts.join(", ");
    }),
    `Generate one suggestion per active goal domain. Include "${ctx.goals.map((g) => g.domain).join('", "')}" domains only.`,
  ].join("\n");

  return {
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: userBlock,
      },
    ],
  };
}
