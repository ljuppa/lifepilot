import { cn } from "@/lib/utils";

type Variant = "opening" | "closing" | "empty" | "observation";

interface CoachVoiceLineProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export function CoachVoiceLine({ children, variant = "opening", className }: CoachVoiceLineProps) {
  return (
    <p
      className={cn(
        "font-serif text-lg italic leading-relaxed text-foreground/80",
        variant === "closing" && "text-center",
        variant === "empty" && "text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}
