export interface BriefingEmailContext {
  userName: string;
  userEmail: string;
  dayOfWeek: string;
  greeting: string;
  suggestions: Array<{
    domain: string;
    title: string;
    body: string;
    action_link_text?: string | null;
    action_link_url?: string | null;
  }>;
  appBaseUrl: string;
}

const DOMAIN_COLOURS: Record<string, string> = {
  health: "#46876A",
  finance: "#E8923A",
  wellness: "#64748B",
};

function domainLabel(domain: string): string {
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

function suggestionHtml(s: BriefingEmailContext["suggestions"][number]): string {
  const colour = DOMAIN_COLOURS[s.domain] ?? "#46876A";
  const badge = `<span style="display:inline-block;background:${colour};color:#ffffff;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;padding:2px 8px;border-radius:4px;margin-bottom:8px;">${domainLabel(s.domain)}</span>`;
  const action = s.action_link_text && s.action_link_url
    ? `<p style="margin:8px 0 0;"><a href="${s.action_link_url}" style="color:#46876A;font-size:14px;">${s.action_link_text}</a></p>`
    : "";
  return `
    <div style="border-left:3px solid ${colour};padding:12px 16px;margin:16px 0;background:#FAFAF8;">
      ${badge}
      <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#2D3142;margin:4px 0;font-style:italic;">${s.body}</p>
      ${action}
    </div>`;
}

function buildFocusPreview(suggestions: BriefingEmailContext["suggestions"]): string {
  const first = suggestions[0];
  return first ? first.title : "Your daily coaching briefing";
}

export function buildBriefingEmail(ctx: BriefingEmailContext): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your ${ctx.dayOfWeek} — ${buildFocusPreview(ctx.suggestions)}`;
  const checkinUrl = `${ctx.appBaseUrl}/checkin`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF9F6;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <p style="font-family:Georgia,serif;font-size:20px;line-height:1.7;color:#2D3142;font-style:italic;margin:0 0 24px;">${ctx.greeting}</p>
  ${ctx.suggestions.map(suggestionHtml).join("")}
  <div style="text-align:center;margin:32px 0;">
    <a href="${checkinUrl}" style="display:inline-block;background:#46876A;color:#ffffff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Log today's check-in</a>
  </div>
  <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#2D3142;font-style:italic;margin:24px 0 0;">That's your ${ctx.dayOfWeek}, ${ctx.userName}. Make it count.</p>
  <hr style="border:none;border-top:1px solid #E5E0D8;margin:24px 0;">
  <p style="font-size:12px;color:#888;margin:0;">✦ AI-generated — not medical, nutritional, or financial advice.</p>
</div>
</body>
</html>`;

  const text = [
    ctx.greeting,
    "",
    ...ctx.suggestions.map((s) => `[${domainLabel(s.domain)}] ${s.title}\n${s.body}`),
    "",
    `Log today's check-in: ${checkinUrl}`,
    "",
    `That's your ${ctx.dayOfWeek}, ${ctx.userName}. Make it count.`,
    "",
    "✦ AI-generated — not medical, nutritional, or financial advice.",
  ].join("\n");

  return { subject, html, text };
}
