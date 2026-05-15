"use client";

import { useEffect, useState } from "react";

interface NotificationPreferences {
  briefingEmails: boolean;
  reengagementEmails: boolean;
}

const DEFAULTS: NotificationPreferences = { briefingEmails: true, reengagementEmails: true };

function SkeletonToggleRow() {
  return (
    <div className="flex items-center justify-between py-4 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-4 w-40 rounded bg-coach-observation" />
        <div className="h-3 w-56 rounded bg-coach-observation" />
      </div>
      <div className="h-6 w-11 rounded-full bg-coach-observation" />
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  id: string;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, description, checked, id, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="space-y-0.5">
        <label htmlFor={id} className="text-sm font-medium leading-none cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          checked ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.notification_preferences) {
          setPrefs(json.data.notification_preferences);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    const prev = prefs[key];
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaveError("");
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (!res.ok) {
      setPrefs((p) => ({ ...p, [key]: prev }));
      const json = await res.json().catch(() => ({}));
      setSaveError((json as { error?: { message?: string } })?.error?.message ?? "Failed to save preference.");
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold mb-8">Settings</h1>

      {saveError && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-6"
        >
          {saveError}
        </div>
      )}

      <section>
        <h2 className="text-base font-medium mb-1">Notification preferences</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Choose which emails you receive from LifePilot.
        </p>
        <div className="divide-y divide-border">
          {isLoading ? (
            <>
              <SkeletonToggleRow />
              <SkeletonToggleRow />
            </>
          ) : (
            <>
              <ToggleRow
                id="toggle-briefing"
                label="Daily briefing emails"
                description="Receive your daily AI briefing in your inbox"
                checked={prefs.briefingEmails}
                onChange={(v) => handleToggle("briefingEmails", v)}
              />
              <ToggleRow
                id="toggle-reengagement"
                label="Re-engagement nudges"
                description="Get a gentle nudge if you haven't checked in for 3 days"
                checked={prefs.reengagementEmails}
                onChange={(v) => handleToggle("reengagementEmails", v)}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
