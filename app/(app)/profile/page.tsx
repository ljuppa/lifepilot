"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProfileUpdateSchema, type ProfileUpdateInput } from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Skeleton card for loading state — UX-DR15
function SkeletonField() {
  return (
    <div className="space-y-1.5 animate-pulse">
      <div className="h-4 w-24 rounded bg-coach-observation" />
      <div className="h-10 w-full rounded bg-coach-observation" />
    </div>
  );
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(ProfileUpdateSchema) as unknown as Resolver<ProfileUpdateInput>,
    mode: "onBlur",
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.data) reset(json.data);
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [reset]);

  async function onSave(data: ProfileUpdateInput) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSavedField("all");
      reset(data);
      setTimeout(() => setSavedField(null), 2000);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 space-y-5">
        <div className="h-8 w-32 rounded bg-coach-observation animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => <SkeletonField key={i} />)}
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-lg px-4 py-12 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your profile</h1>
          {savedField === "all" && (
            <span className="text-sm font-medium text-primary">Saved ✓</span>
          )}
        </div>

        <form onSubmit={handleSubmit(onSave)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")}
              aria-describedby={errors.name ? "name-err" : undefined} />
            {errors.name && <p id="name-err" role="alert" className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" {...register("age")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register("location")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="height">Height (cm)</Label>
              <Input id="height" type="number" {...register("height")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" {...register("weight")} />
            </div>
          </div>

          <h2 className="pt-2 text-base font-medium">Budget</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="monthly_income">Monthly income</Label>
              <Input id="monthly_income" type="number" {...register("monthly_income")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fixed_expenses">Fixed expenses</Label>
              <Input id="fixed_expenses" type="number" {...register("fixed_expenses")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discretionary_budget">Discretionary budget</Label>
              <Input id="discretionary_budget" type="number" {...register("discretionary_budget")} />
            </div>
          </div>

          <h2 className="pt-2 text-base font-medium">Briefing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="briefing_time">Time</Label>
              <Input id="briefing_time" type="time" {...register("briefing_time")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" {...register("timezone")} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Save changes</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (isDirty) { setShowLeaveDialog(true); setPendingNav("/dashboard"); }
                else window.location.href = "/dashboard";
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Unsaved changes dialog — AC3 */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogHeader>
          <DialogTitle>You have unsaved changes. Leave?</DialogTitle>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="ghost" onClick={() => setShowLeaveDialog(false)}>Stay</Button>
          <Button
            variant="outline"
            onClick={() => { setShowLeaveDialog(false); window.location.href = pendingNav ?? "/dashboard"; }}
          >
            Leave anyway
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
