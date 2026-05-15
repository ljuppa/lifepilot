export interface DataExportEmailContext {
  userName: string;
  downloadUrl: string;
  appBaseUrl: string;
}

export function buildDataExportEmail(ctx: DataExportEmailContext): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "Your LifePilot data export is ready",
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF9F6;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <p style="font-family:Georgia,serif;font-size:20px;line-height:1.7;color:#2D3142;font-style:italic;margin:0 0 24px;">Hi ${ctx.userName},</p>
  <p style="font-size:16px;color:#2D3142;margin:0 0 16px;">Your LifePilot data export is ready to download. It includes your profile, goals, check-ins, briefings, and activity log.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="${ctx.downloadUrl}" style="display:inline-block;background:#46876A;color:#ffffff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Download your data</a>
  </div>
  <p style="font-size:14px;color:#888;margin:0 0 24px;">This link expires in 1 hour. If it has expired, you can request a new export from your <a href="${ctx.appBaseUrl}/data" style="color:#46876A;">data page</a>.</p>
  <hr style="border:none;border-top:1px solid #E5E0D8;margin:24px 0;">
  <p style="font-size:12px;color:#888;margin:0;">LifePilot — your personal AI coach</p>
</div>
</body>
</html>`,
    text: `Hi ${ctx.userName},\n\nYour LifePilot data export is ready.\n\nDownload your data: ${ctx.downloadUrl}\n\nThis link expires in 1 hour. If it has expired, request a new export at: ${ctx.appBaseUrl}/data\n\n— LifePilot`,
  };
}
