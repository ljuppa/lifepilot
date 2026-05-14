"use client";

import { useState } from "react";

const EU_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI",
  "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
  "NL", "PL", "PT", "RO", "SE", "SI", "SK",
  // EEA
  "NO", "IS", "LI",
]);

interface CookieConsentBannerProps {
  country: string;
}

export function CookieConsentBanner({ country }: CookieConsentBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!EU_COUNTRY_CODES.has(country.toUpperCase()) || dismissed) {
    return null;
  }

  async function handleAccept() {
    setDismissed(true);
    await fetch("/api/cookie-consent", { method: "POST" });
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          We use session cookies to keep you signed in. By continuing, you accept our use of cookies.{" "}
          <a href="/privacy" className="underline hover:no-underline">
            Privacy Policy
          </a>
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
