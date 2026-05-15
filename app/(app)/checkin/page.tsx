"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";
import { MoodSelector } from "@/components/ui/mood-selector";
import { useCheckinQueue } from "@/lib/hooks/use-checkin-queue";
import type { CheckinInput } from "@/lib/validation/checkin";

type Domain = "health" | "finance" | "wellness";

interface ActiveGoal {
  id: string;
  domain: Domain;
}

type Phase = "loading" | "conflict" | "form" | "submitted";

export default function CheckinPage() {
  const router = useRouter();
  const { enqueue, sync, syncStatus, hasPending, peekOldest, discardOldest } = useCheckinQueue();

  const [phase, setPhase] = useState<Phase>("loading");
  const [activeDomains, setActiveDomains] = useState<Domain[]>([]);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [lastCheckinTime, setLastCheckinTime] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [mood, setMood] = useState<number | null>(null);
  const [healthMetric, setHealthMetric] = useState("");
  const [financeMetric, setFinanceMetric] = useState("");
  const [wellnessMetric, setWellnessMetric] = useState("");
  const [note, setNote] = useState("");
  const [moodError, setMoodError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/goals").then((r) => r.json()),
      fetch("/api/checkin").then((r) => r.json()),
    ]).then(([goalsJson, checkinsJson]) => {
      if (cancelled) return;

      const goals: ActiveGoal[] = goalsJson.data ?? [];
      setActiveDomains(goals.map((g) => g.domain));

      const checkins: { checked_in_at: string }[] = checkinsJson.data ?? [];
      if (checkins.length > 0) {
        const latest = checkins[0];
        const today = new Date().toLocaleDateString();
        const checkinDay = new Date(latest.checked_in_at).toLocaleDateString();
        if (today === checkinDay) {
          setAlreadyCheckedIn(true);
          setLastCheckinTime(
            new Date(latest.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          );
        }
      }

      if (hasPending()) {
        setPhase("conflict");
      } else {
        setPhase("form");
      }
    });
    return () => { cancelled = true; };
  }, [hasPending]);

  async function handleSubmit() {
    if (!mood) {
      setMoodError("Please select your mood.");
      return;
    }
    setMoodError("");
    setIsSubmitting(true);
    setNetworkError("");

    const payload: CheckinInput = {
      mood,
      ...(activeDomains.includes("health") && healthMetric ? { health_metric: Number(healthMetric) } : {}),
      ...(activeDomains.includes("finance") && financeMetric ? { finance_metric: Number(financeMetric) } : {}),
      ...(activeDomains.includes("wellness") && wellnessMetric ? { wellness_metric: Number(wellnessMetric) } : {}),
      ...(note ? { note } : {}),
    };

    if (!navigator.onLine) {
      enqueue(payload);
      setNetworkError("offline");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setPhase("submitted");
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        const json = await res.json();
        // Network available but request failed — queue it
        enqueue(payload);
        setNetworkError(json?.error?.message ?? "Couldn't save — saved offline.");
      }
    } catch {
      enqueue(payload);
      setNetworkError("offline");
    }

    setIsSubmitting(false);
  }

  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-coach-observation animate-pulse" />
        ))}
      </div>
    );
  }

  if (phase === "submitted") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 flex flex-col items-center gap-6">
        <CoachVoiceLine variant="closing">
          Got it — I&apos;ll adjust tomorrow&apos;s briefing.
        </CoachVoiceLine>
      </div>
    );
  }

  if (phase === "conflict") {
    const oldest = peekOldest();
    const time = oldest
      ? new Date(oldest.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
    return (
      <div className="mx-auto max-w-lg px-4 py-12 space-y-6">
        <CoachVoiceLine variant="opening">
          You have a check-in from {time} waiting to sync — sync it now or replace it?
        </CoachVoiceLine>
        <div className="flex gap-3">
          <Button
            onClick={async () => { await sync(); setPhase("form"); }}
            disabled={syncStatus === "syncing"}
          >
            {syncStatus === "syncing" ? "Syncing…" : "Sync now"}
          </Button>
          <Button variant="ghost" onClick={() => { discardOldest(); setPhase("form"); }}>
            Replace
          </Button>
        </div>
      </div>
    );
  }

  if (alreadyCheckedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <CoachVoiceLine variant="closing">
          You&apos;ve already checked in today{lastCheckinTime ? ` at ${lastCheckinTime}` : ""} — see you tomorrow!
        </CoachVoiceLine>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-8">
      <CoachVoiceLine variant="opening">
        How&apos;s it going today?
      </CoachVoiceLine>

      {/* Offline banner */}
      {networkError === "offline" ? (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Saved offline — will sync when you&apos;re back online.
        </div>
      ) : networkError ? (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {networkError}
        </div>
      ) : null}

      {/* Sync status banner */}
      {syncStatus === "synced" && (
        <div role="status" className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          Check-in synced!
        </div>
      )}
      {syncStatus === "failed" && (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center justify-between">
          <span>Check-in couldn&apos;t sync — tap to retry</span>
          <Button size="sm" variant="ghost" onClick={sync}>Retry</Button>
        </div>
      )}

      {/* Mood */}
      <div className="space-y-3">
        <Label className="text-base">How are you feeling today?</Label>
        <MoodSelector value={mood} onChange={setMood} />
        {moodError && (
          <p role="alert" className="text-sm text-destructive text-center">{moodError}</p>
        )}
      </div>

      {/* Domain metrics */}
      {activeDomains.includes("health") && (
        <div className="space-y-2">
          <Label htmlFor="health-metric" className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-primary">Health</span>
            Weight today (kg)
          </Label>
          <div className="flex gap-2 items-center">
            <Input
              id="health-metric"
              type="number"
              min={0}
              step={0.1}
              placeholder="e.g. 72.5"
              value={healthMetric}
              onChange={(e) => setHealthMetric(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => setHealthMetric("")}>
              Skip
            </Button>
          </div>
        </div>
      )}

      {activeDomains.includes("finance") && (
        <div className="space-y-2">
          <Label htmlFor="finance-metric" className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-amber-600">Finance</span>
            Daily spend
          </Label>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="finance-metric"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={financeMetric}
                onChange={(e) => setFinanceMetric(e.target.value)}
                className="pl-6"
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFinanceMetric("")}>
              Skip
            </Button>
          </div>
        </div>
      )}

      {activeDomains.includes("wellness") && (
        <div className="space-y-2">
          <Label htmlFor="wellness-metric" className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Wellness</span>
            Sleep last night (hours)
          </Label>
          <div className="flex gap-2 items-center">
            <Input
              id="wellness-metric"
              type="number"
              min={0}
              max={24}
              step={0.5}
              placeholder="e.g. 7.5"
              value={wellnessMetric}
              onChange={(e) => setWellnessMetric(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => setWellnessMetric("")}>
              Skip
            </Button>
          </div>
        </div>
      )}

      {/* Optional note */}
      <div className="space-y-2">
        <Label htmlFor="note" className="flex items-center justify-between">
          <span>Anything else? <span className="text-muted-foreground font-normal">(optional)</span></span>
          <span className="text-xs text-muted-foreground">{note.length}/80</span>
        </Label>
        <textarea
          id="note"
          rows={2}
          maxLength={80}
          placeholder="A quick note for tomorrow's briefing…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "Saving…" : "Complete check-in"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setNote("")}>
          Skip note
        </Button>
      </div>
    </div>
  );
}
