"use client";

import { Button } from "@/components/ui/button";
import { CoachVoiceLine } from "@/components/ui/coach-voice-line";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-10 space-y-4">
      <CoachVoiceLine variant="empty">
        Something went wrong. Please try again.
      </CoachVoiceLine>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
