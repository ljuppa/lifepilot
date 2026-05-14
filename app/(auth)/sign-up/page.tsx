"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { SignUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PageState = "form" | "check-inbox";

export default function SignUpPage() {
  const [pageState, setPageState] = useState<PageState>("form");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [networkError, setNetworkError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    mode: "onBlur",
  });

  async function onSubmit(data: SignUpInput) {
    setNetworkError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) {
        const message = json?.error?.message ?? "Could not create account. Please try again.";
        if (json?.error?.code === "EMAIL_EXISTS") {
          setNetworkError(message);
        } else {
          setNetworkError(message);
        }
        return;
      }

      setRegisteredEmail(data.email);
      setPageState("check-inbox");
    } catch {
      setNetworkError("Couldn't create your account — tap to try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pageState === "check-inbox") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-2xl font-semibold">Check your inbox</h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a verification link to{" "}
            <span className="font-medium text-foreground">{registeredEmail}</span>.
            Click the link to activate your account.
          </p>
          <p className="text-sm text-muted-foreground">
            Already verified?{" "}
            <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* Amber error banner — network / server errors */}
        {networkError && (
          <div
            role="alert"
            className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {networkError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" role="alert" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password && (
              <p id="password-error" role="alert" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <input
              id="age-confirm"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              aria-describedby={errors.ageConfirmed ? "age-error" : undefined}
              {...register("ageConfirmed")}
            />
            <div className="space-y-1">
              <Label htmlFor="age-confirm" className="cursor-pointer font-normal">
                I confirm I am 18 years of age or older
              </Label>
              {errors.ageConfirmed && (
                <p id="age-error" role="alert" className="text-sm text-destructive">
                  {errors.ageConfirmed.message}
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
                Creating account…
              </span>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
