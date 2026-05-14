"use client";

import { cn } from "@/lib/utils";

export type Domain = "health" | "finance" | "wellness";

const DOMAIN_CONFIG: Record<Domain, { label: string; icon: string; colorClass: string; selectedClass: string }> = {
  health: {
    label: "Health",
    icon: "🌿",
    colorClass: "border-primary/40 text-primary bg-primary/5",
    selectedClass: "border-primary bg-primary text-primary-foreground",
  },
  finance: {
    label: "Finance",
    icon: "🪙",
    colorClass: "border-accent/40 text-accent bg-accent/5",
    selectedClass: "border-accent bg-accent text-accent-foreground",
  },
  wellness: {
    label: "Wellness",
    icon: "🧘",
    colorClass: "border-slate-400 text-slate-600 bg-slate-50",
    selectedClass: "border-slate-500 bg-slate-500 text-white",
  },
};

interface DomainChipSelectorProps {
  value: Domain[];
  onChange: (value: Domain[]) => void;
  disabled?: boolean;
}

export function DomainChipSelector({ value, onChange, disabled }: DomainChipSelectorProps) {
  function toggle(domain: Domain) {
    if (value.includes(domain)) {
      onChange(value.filter((d) => d !== domain));
    } else if (value.length < 3) {
      onChange([...value, domain]);
    }
  }

  return (
    <div role="group" aria-label="Select goal domains" className="flex flex-wrap gap-2">
      {(Object.keys(DOMAIN_CONFIG) as Domain[]).map((domain) => {
        const { label, icon, colorClass, selectedClass } = DOMAIN_CONFIG[domain];
        const isSelected = value.includes(domain);
        return (
          <button
            key={domain}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            disabled={disabled || (!isSelected && value.length >= 3)}
            onClick={() => toggle(domain)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isSelected ? selectedClass : colorClass
            )}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

interface DomainChipDisplayProps {
  domain: Domain;
  className?: string;
}

export function DomainChipDisplay({ domain, className }: DomainChipDisplayProps) {
  const { label, icon, colorClass } = DOMAIN_CONFIG[domain];
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium",
        colorClass,
        className
      )}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
