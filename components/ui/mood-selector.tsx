"use client";

import { useRef, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

const MOODS = [
  { value: 1, label: "Mood 1 of 5", color: "bg-amber-300 border-amber-400" },
  { value: 2, label: "Mood 2 of 5", color: "bg-amber-200 border-amber-300" },
  { value: 3, label: "Mood 3 of 5", color: "bg-coach-observation border-[#c9c0b0]" },
  { value: 4, label: "Mood 4 of 5", color: "bg-primary/30 border-primary/50" },
  { value: 5, label: "Mood 5 of 5", color: "bg-primary/60 border-primary" },
];

interface MoodSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
}

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKey(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(idx + 1, MOODS.length - 1);
      refs.current[next]?.focus();
      onChange(MOODS[next].value);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(idx - 1, 0);
      refs.current[prev]?.focus();
      onChange(MOODS[prev].value);
    }
  }

  return (
    <div role="radiogroup" aria-label="How are you feeling today?" className="flex gap-3 justify-center">
      {MOODS.map((mood, idx) => {
        const selected = value === mood.value;
        return (
          <button
            key={mood.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={mood.label}
            ref={(el) => { refs.current[idx] = el; }}
            tabIndex={selected || (value === null && idx === 0) ? 0 : -1}
            onClick={() => onChange(mood.value)}
            onKeyDown={(e) => handleKey(e, idx)}
            className={cn(
              "w-11 h-11 rounded-full border-2 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              mood.color,
              selected ? "scale-[1.15] shadow-md" : "hover:scale-105"
            )}
          />
        );
      })}
    </div>
  );
}
