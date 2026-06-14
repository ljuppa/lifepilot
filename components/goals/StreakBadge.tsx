"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

const MILESTONES = new Set([7, 30, 100]);

interface StreakBadgeProps {
  streakDays: number;
}

export function StreakBadge({ streakDays }: StreakBadgeProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!MILESTONES.has(streakDays)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const tOn = setTimeout(() => setPulse(true), 0);
    const tOff = setTimeout(() => setPulse(false), 1500);
    return () => { clearTimeout(tOn); clearTimeout(tOff); };
  }, [streakDays]);

  if (streakDays === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
        <Flame size={16} className="text-muted-foreground/50" />
        Start your streak
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm${pulse ? " animate-pulse" : ""}`}
    >
      <Flame size={16} className="text-amber-500" />
      <span className="font-semibold">{streakDays}</span>
      <span className="text-muted-foreground">day streak</span>
    </span>
  );
}
