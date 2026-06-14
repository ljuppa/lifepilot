function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const COMPANY_ADDRESS =
  process.env.COMPANY_MAILING_ADDRESS ?? "LifePilot, 548 Market St, San Francisco CA 94104";

export function buildBroadcastEmail(
  subject: string,
  body: string,
  unsubscribeUrl?: string
): { subject: string; html: string; text: string } {
  const paragraphs = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const paragraphsHtml = paragraphs
    .map((p) => `<p style="font-size:15px;line-height:1.7;color:#2D3142;margin:0 0 16px;">${escapeHtml(p)}</p>`)
    .join("\n  ");

  const unsubscribeHtml = unsubscribeUrl
    ? `<p style="font-size:12px;color:#888;margin:8px 0 0;">Don't want these emails? <a href="${escapeHtml(unsubscribeUrl)}" style="color:#888;">Unsubscribe</a></p>`
    : "";
  const unsubscribeText = unsubscribeUrl ? `\nTo unsubscribe: ${unsubscribeUrl}` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF9F6;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  ${paragraphsHtml}
  <hr style="border:none;border-top:1px solid #E5E0D8;margin:24px 0;">
  <p style="font-size:12px;color:#888;margin:0;">${escapeHtml(COMPANY_ADDRESS)}</p>
  ${unsubscribeHtml}
</div>
</body>
</html>`;

  const text = [paragraphs.join("\n\n"), "", COMPANY_ADDRESS + unsubscribeText].join("\n");

  return { subject, html, text };
}
