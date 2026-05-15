import { describe, expect, it } from "vitest";
import { buildDataExportEmail } from "../templates/dataExport";

const ctx = {
  userName: "Alice",
  downloadUrl: "https://storage.example.com/exports/user-id/file.json?token=abc",
  appBaseUrl: "https://lifepilot.app",
};

describe("buildDataExportEmail", () => {
  it("returns the correct subject", () => {
    const { subject } = buildDataExportEmail(ctx);
    expect(subject).toBe("Your LifePilot data export is ready");
  });

  it("includes the CTA download URL in the HTML", () => {
    const { html } = buildDataExportEmail(ctx);
    expect(html).toContain(ctx.downloadUrl);
    expect(html).toContain("Download your data");
  });

  it("includes the CTA download URL in the plain text", () => {
    const { text } = buildDataExportEmail(ctx);
    expect(text).toContain(ctx.downloadUrl);
  });

  it("returns subject, html, and text fields", () => {
    const result = buildDataExportEmail(ctx);
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("text");
  });

  it("includes the userName greeting in both html and text", () => {
    const { html, text } = buildDataExportEmail(ctx);
    expect(html).toContain("Alice");
    expect(text).toContain("Alice");
  });

  it("includes the expiry notice in the HTML", () => {
    const { html } = buildDataExportEmail(ctx);
    expect(html).toContain("expires in 1 hour");
  });

  it("includes a link back to the data page for expired links", () => {
    const { html, text } = buildDataExportEmail(ctx);
    expect(html).toContain(`${ctx.appBaseUrl}/data`);
    expect(text).toContain(`${ctx.appBaseUrl}/data`);
  });
});
