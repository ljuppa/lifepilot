"use client";

import { useState } from "react";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";

const SUBJECT_MAX = 120;
const BODY_MAX = 2000;

export default function BroadcastForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json?.error?.message ?? "Failed to send broadcast.");
      } else {
        setSuccessMessage(json?.data?.message ?? "Broadcast queued successfully.");
        setSubject("");
        setBody("");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {successMessage && (
        <CoachVoiceLine variant="closing">{successMessage}</CoachVoiceLine>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {errorMessage}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="broadcast-subject" className="text-sm font-medium">
            Subject
          </label>
          <span className="text-xs text-muted-foreground">
            {subject.length}/{SUBJECT_MAX}
          </span>
        </div>
        <input
          id="broadcast-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={SUBJECT_MAX}
          required
          placeholder="e.g. Important update from LifePilot"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="broadcast-body" className="text-sm font-medium">
            Message
          </label>
          <span className="text-xs text-muted-foreground">
            {body.length}/{BODY_MAX}
          </span>
        </div>
        <textarea
          id="broadcast-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={BODY_MAX}
          required
          rows={8}
          placeholder="Write your message here. Each line will become a separate paragraph in the email."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send broadcast"}
      </button>
    </form>
  );
}
