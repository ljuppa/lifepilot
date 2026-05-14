"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  ProfileStep1Schema, ProfileStep2Schema,
  ProfileStep4Schema, ProfileConsentSchema,
  type ProfileStep1Input, type ProfileStep2Input,
  type ProfileStep4Input,
  type GoalInput,
} from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";
import { DomainChipSelector, type Domain } from "@/components/ui/domain-chip";

type Step = 1 | 2 | 3 | 4 | 5;

const TOTAL_STEPS = 3; // visible step counter: profile → budget → goals

function StepIndicator({ step }: { step: Step }) {
  if (step > 3) return null;
  return (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      Step {step} of {TOTAL_STEPS}
    </p>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [networkError, setNetworkError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Accumulated wizard data
  const [step1Data, setStep1Data] = useState<ProfileStep1Input | null>(null);
  const [step2Data, setStep2Data] = useState<ProfileStep2Input | null>(null);
  const [goals, setGoals] = useState<GoalInput[]>([]);
  const [step4Data, setStep4Data] = useState<ProfileStep4Input | null>(null);

  // Step 1
  const form1 = useForm<ProfileStep1Input>({
    resolver: zodResolver(ProfileStep1Schema) as unknown as Resolver<ProfileStep1Input>,
    defaultValues: step1Data ?? {},
    mode: "onBlur",
  });

  // Step 2
  const form2 = useForm<ProfileStep2Input>({
    resolver: zodResolver(ProfileStep2Schema) as unknown as Resolver<ProfileStep2Input>,
    defaultValues: step2Data ?? {},
    mode: "onBlur",
  });

  // Step 3 — goal domains
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>(
    goals.map((g) => g.domain)
  );
  const [goalTitles, setGoalTitles] = useState<Record<Domain, string>>(
    goals.reduce((acc, g) => ({ ...acc, [g.domain]: g.title }), {} as Record<Domain, string>)
  );
  const [step3Error, setStep3Error] = useState("");

  // Step 4
  const form4 = useForm<ProfileStep4Input>({
    resolver: zodResolver(ProfileStep4Schema),
    defaultValues: step4Data ?? {
      briefing_time: "07:00",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    mode: "onBlur",
  });

  // Step 5 — consent
  const form5 = useForm<{ consent: true }>({
    resolver: zodResolver(ProfileConsentSchema),
  });

  function handleStep1(data: ProfileStep1Input) {
    setStep1Data(data);
    setStep(2);
  }

  function handleStep2(data: ProfileStep2Input) {
    setStep2Data(data);
    setStep(3);
  }

  function handleStep3() {
    if (selectedDomains.length === 0) {
      setStep3Error("Please select at least one goal domain.");
      return;
    }
    const missing = selectedDomains.find((d) => !goalTitles[d]?.trim());
    if (missing) {
      setStep3Error(`Please enter a goal title for ${missing}.`);
      return;
    }
    setStep3Error("");
    setGoals(selectedDomains.map((d) => ({ domain: d, title: goalTitles[d].trim() })));
    setStep(4);
  }

  function handleStep4(data: ProfileStep4Input) {
    setStep4Data(data);
    setStep(5);
  }

  async function handleConsent() {
    if (!step1Data || !step4Data) return;
    setNetworkError("");
    setIsSubmitting(true);

    try {
      // Create profile
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...step1Data,
          ...step2Data,
          briefing_time: step4Data.briefing_time,
          timezone: step4Data.timezone,
        }),
      });
      if (!profileRes.ok) {
        const json = await profileRes.json();
        throw new Error(json?.error?.message ?? "Failed to save profile.");
      }

      // Create goals
      for (const goal of goals) {
        const goalRes = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(goal),
        });
        if (!goalRes.ok) {
          const json = await goalRes.json();
          throw new Error(json?.error?.message ?? "Failed to save goals.");
        }
      }

      // Log consent
      await fetch("/api/cookie-consent", { method: "POST" });

      router.push("/dashboard");
    } catch (err) {
      setNetworkError(
        err instanceof Error ? err.message : "Couldn't save your profile — tap to try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-start justify-center px-4 pt-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <StepIndicator step={step} />
          {step > 1 && step <= 3 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
          )}
        </div>

        {networkError && (
          <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {networkError}
          </div>
        )}

        {/* ── Step 1: Basic profile ── */}
        {step === 1 && (
          <form onSubmit={form1.handleSubmit(handleStep1)} noValidate className="space-y-5">
            <CoachVoiceLine>
              Let&apos;s start with the basics — what should I call you?
            </CoachVoiceLine>

            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" autoFocus {...form1.register("name")}
                aria-describedby={form1.formState.errors.name ? "name-error" : undefined} />
              {form1.formState.errors.name && (
                <p id="name-error" role="alert" className="text-sm text-destructive" aria-live="polite">
                  {form1.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" min={18} max={120} {...form1.register("age")}
                aria-describedby={form1.formState.errors.age ? "age-error" : undefined} />
              {form1.formState.errors.age && (
                <p id="age-error" role="alert" className="text-sm text-destructive" aria-live="polite">
                  {form1.formState.errors.age.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="height">Height (cm) <span className="text-muted-foreground">optional</span></Label>
                <Input id="height" type="number" {...form1.register("height")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight">Weight (kg) <span className="text-muted-foreground">optional</span></Label>
                <Input id="weight" type="number" {...form1.register("weight")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location <span className="text-muted-foreground">optional</span></Label>
              <Input id="location" placeholder="City, Country" {...form1.register("location")} />
            </div>

            <Button type="submit" className="w-full">Continue</Button>
          </form>
        )}

        {/* ── Step 2: Budget ── */}
        {step === 2 && (
          <form onSubmit={form2.handleSubmit(handleStep2)} noValidate className="space-y-5">
            <CoachVoiceLine>
              Tell me a little about your finances — this helps me tailor your money goals.
            </CoachVoiceLine>

            <div className="space-y-1.5">
              <Label htmlFor="monthly_income">Monthly income <span className="text-muted-foreground">optional</span></Label>
              <Input id="monthly_income" type="number" min={0} {...form2.register("monthly_income")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fixed_expenses">Fixed expenses / month <span className="text-muted-foreground">optional</span></Label>
              <Input id="fixed_expenses" type="number" min={0} {...form2.register("fixed_expenses")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discretionary_budget">Discretionary budget / month <span className="text-muted-foreground">optional</span></Label>
              <Input id="discretionary_budget" type="number" min={0} {...form2.register("discretionary_budget")} />
            </div>

            <Button type="submit" className="w-full">Continue</Button>
          </form>
        )}

        {/* ── Step 3: Goals ── */}
        {step === 3 && (
          <div className="space-y-5">
            <CoachVoiceLine>
              What do you most want to work on? Pick up to three areas.
            </CoachVoiceLine>

            <div className="space-y-3">
              <Label>Goal areas</Label>
              <DomainChipSelector value={selectedDomains} onChange={setSelectedDomains} />
              {step3Error && (
                <p role="alert" className="text-sm text-destructive" aria-live="polite">{step3Error}</p>
              )}
            </div>

            {selectedDomains.map((domain) => (
              <div key={domain} className="space-y-1.5">
                <Label htmlFor={`goal-${domain}`}>
                  {domain.charAt(0).toUpperCase() + domain.slice(1)} goal
                </Label>
                <Input
                  id={`goal-${domain}`}
                  placeholder={
                    domain === "health" ? "e.g. Lose 5kg by summer"
                    : domain === "finance" ? "e.g. Save $500/month"
                    : "e.g. Sleep 8 hours a night"
                  }
                  value={goalTitles[domain] ?? ""}
                  onChange={(e) => setGoalTitles((t) => ({ ...t, [domain]: e.target.value }))}
                />
              </div>
            ))}

            <Button type="button" onClick={handleStep3} className="w-full">Continue</Button>
          </div>
        )}

        {/* ── Step 4: Briefing time ── */}
        {step === 4 && (
          <form onSubmit={form4.handleSubmit(handleStep4)} noValidate className="space-y-5">
            <CoachVoiceLine>
              When would you like your daily briefing delivered?
            </CoachVoiceLine>

            <div className="space-y-1.5">
              <Label htmlFor="briefing_time">Briefing time</Label>
              <Input id="briefing_time" type="time" {...form4.register("briefing_time")}
                aria-describedby={form4.formState.errors.briefing_time ? "bt-error" : undefined} />
              {form4.formState.errors.briefing_time && (
                <p id="bt-error" role="alert" className="text-sm text-destructive" aria-live="polite">
                  {form4.formState.errors.briefing_time.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" {...form4.register("timezone")} placeholder="e.g. Europe/London" />
            </div>

            <Button type="submit" className="w-full">Continue</Button>
          </form>
        )}

        {/* ── Step 5: Consent ── */}
        {step === 5 && (
          <form onSubmit={form5.handleSubmit(handleConsent)} noValidate className="space-y-5">
            <CoachVoiceLine>
              Almost there — just one important step before we begin.
            </CoachVoiceLine>

            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3 text-sm text-muted-foreground">
              <p><strong className="text-foreground">What we collect:</strong> Your profile details, life goals, daily check-ins, and AI-generated briefings.</p>
              <p><strong className="text-foreground">Legal basis:</strong> Contract performance (GDPR Art. 6(1)(b)) — we need this data to deliver your personalised coaching.</p>
              <p><strong className="text-foreground">Sub-processors:</strong> Supabase (database), Anthropic (AI), Resend (email), Vercel (hosting), Inngest (jobs).</p>
              <p><strong className="text-foreground">Retention:</strong> Check-ins deleted after 12 months, briefings after 6 months, account data within 30 days of deletion.</p>
              <a href="/privacy" className="text-primary underline-offset-4 hover:underline">View full Privacy Policy</a>
            </div>

            <div className="flex items-start gap-2">
              <input
                id="consent"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                aria-describedby={form5.formState.errors.consent ? "consent-error" : undefined}
                {...form5.register("consent")}
              />
              <div>
                <Label htmlFor="consent" className="cursor-pointer font-normal">
                  I understand and agree to LifePilot processing my data as described above, including AI-generated content (EU AI Act 2024).
                </Label>
                {form5.formState.errors.consent && (
                  <p id="consent-error" role="alert" className="mt-1 text-sm text-destructive" aria-live="polite">
                    {form5.formState.errors.consent.message}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Setting up your account…
                </span>
              ) : "Start my journey"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
