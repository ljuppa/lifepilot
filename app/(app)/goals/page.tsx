"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoalInputSchema, type GoalInput } from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";
import { DomainChipSelector, DomainChipDisplay, type Domain } from "@/components/ui/domain-chip";

interface Goal {
  id: string;
  domain: Domain;
  title: string;
  status: "active" | "inactive";
}

function SkeletonGoal() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-4 animate-pulse">
      <div className="h-8 w-20 rounded-full bg-coach-observation" />
      <div className="h-4 flex-1 rounded bg-coach-observation" />
      <div className="h-8 w-16 rounded bg-coach-observation" />
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState("");

  const atLimit = goals.length >= 3;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/goals")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.data) setGoals(json.data);
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function handleRemove(id: string) {
    setRemovingId(id);
    setNetworkError("");
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setGoals((g) => g.filter((goal) => goal.id !== id));
    } else {
      const json = await res.json();
      setNetworkError(json?.error?.message ?? "Failed to remove goal.");
    }
    setRemovingId(null);
    setConfirmRemoveId(null);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your goals</h1>
      </div>

      {networkError && (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {networkError}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonGoal />
          <SkeletonGoal />
        </div>
      ) : goals.length === 0 ? (
        <CoachVoiceLine variant="empty">
          You have no active goals yet. Add one to get started.
        </CoachVoiceLine>
      ) : (
        <ul className="space-y-3" aria-label="Active goals">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="flex items-center gap-3 rounded-lg border border-border p-4"
            >
              <DomainChipDisplay domain={goal.domain} />
              <span className="flex-1 text-sm">{goal.title}</span>
              {confirmRemoveId === goal.id ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemove(goal.id)}
                    disabled={removingId === goal.id}
                  >
                    {removingId === goal.id ? "Removing…" : "Confirm"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRemoveId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmRemoveId(goal.id)}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isLoading && (
        atLimit ? (
          <p className="text-sm text-muted-foreground">
            You&apos;ve reached the maximum of 3 active goals.
          </p>
        ) : (
          !showAddForm && (
            <Button variant="outline" onClick={() => setShowAddForm(true)}>
              + Add goal
            </Button>
          )
        )
      )}

      {showAddForm && !atLimit && (
        <AddGoalForm
          onSaved={(newGoal) => {
            setGoals((g) => [...g, newGoal]);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

function AddGoalForm({
  onSaved,
  onCancel,
}: {
  onSaved: (goal: Goal) => void;
  onCancel: () => void;
}) {
  const [selectedDomain, setSelectedDomain] = useState<Domain[]>([]);
  const [domainError, setDomainError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<GoalInput>({
    resolver: zodResolver(GoalInputSchema),
    mode: "onBlur",
  });

  async function onSubmit(data: GoalInput) {
    if (selectedDomain.length === 0) {
      setDomainError("Please select a domain.");
      return;
    }
    setDomainError("");

    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, domain: selectedDomain[0] }),
    });

    if (res.ok) {
      const json = await res.json();
      onSaved(json.data);
    } else {
      const json = await res.json();
      setError("title", { message: json?.error?.message ?? "Failed to add goal." });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-lg border border-border p-4 space-y-4">
      <h2 className="text-base font-medium">New goal</h2>

      <div className="space-y-1.5">
        <Label>Domain</Label>
        <DomainChipSelector
          value={selectedDomain}
          onChange={(v) => setSelectedDomain(v.slice(-1) as Domain[])}
        />
        {domainError && (
          <p role="alert" className="text-sm text-destructive">{domainError}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-title">Goal title</Label>
        <Input
          id="goal-title"
          placeholder="e.g. Run 5k three times a week"
          {...register("title")}
          aria-describedby={errors.title ? "goal-title-err" : undefined}
        />
        {errors.title && (
          <p id="goal-title-err" role="alert" className="text-sm text-destructive">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save goal"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
