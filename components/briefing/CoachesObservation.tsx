interface CoachesObservationProps {
  body: string;
}

export function CoachesObservation({ body }: CoachesObservationProps) {
  return (
    <div
      role="note"
      aria-label="Coach's Observation"
      className="coach-observation-surface rounded-r-lg p-6 space-y-2"
    >
      <p className="text-[11px] font-sans uppercase tracking-widest text-accent">
        Coach&apos;s Observation
      </p>
      <p className="font-serif italic text-[15px] leading-relaxed">{body}</p>
    </div>
  );
}
