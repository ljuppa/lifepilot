"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";

type Status = "idle" | "loading" | "success" | "error";

export default function DataPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleExport() {
    setStatus("loading");
    setErrorMessage("");
    const res = await fetch("/api/export", { method: "POST" });
    if (res.ok) {
      setStatus("success");
    } else {
      const json = await res.json().catch(() => ({}));
      setErrorMessage(
        (json as { error?: { message?: string } })?.error?.message ??
          "Something went wrong. Please try again."
      );
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold mb-2">Your data</h1>
      <p className="text-sm text-muted-foreground mb-8">
        You can request a full copy of all the data LifePilot holds about you, including your
        profile, goals, check-ins, and briefings. We&apos;ll email you a download link within a few
        minutes.
      </p>

      {status === "success" ? (
        <CoachVoiceLine variant="closing">
          Your export is being prepared — you&apos;ll receive an email when it&apos;s ready.
        </CoachVoiceLine>
      ) : (
        <>
          {status === "error" && (
            <div
              role="alert"
              className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-6"
            >
              {errorMessage}
            </div>
          )}
          <Button onClick={handleExport} disabled={status === "loading"}>
            {status === "loading" ? "Requesting…" : "Request data export"}
          </Button>
        </>
      )}
    </div>
  );
}
