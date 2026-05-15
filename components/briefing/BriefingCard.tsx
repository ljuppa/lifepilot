import { DomainChipDisplay, type Domain } from "@/components/ui/domain-chip";

interface BriefingCardGreetingProps {
  variant: "greeting";
  body: string;
}

interface BriefingCardSuggestionProps {
  variant: "suggestion";
  domain: Domain;
  body: string;
  actionLinkText?: string | null;
  actionLinkUrl?: string | null;
}

type BriefingCardProps = BriefingCardGreetingProps | BriefingCardSuggestionProps;

export function BriefingCard(props: BriefingCardProps) {
  const isGreeting = props.variant === "greeting";
  const ariaLabel = isGreeting ? "Daily greeting" : `${(props as BriefingCardSuggestionProps).domain} suggestion`;

  return (
    <article
      role="article"
      aria-label={ariaLabel}
      className="bg-card rounded-2xl border border-border p-6 space-y-3 shadow-sm"
    >
      {!isGreeting && (
        <DomainChipDisplay domain={(props as BriefingCardSuggestionProps).domain} />
      )}
      <p className="prose-briefing text-foreground/90">{props.body}</p>
      {!isGreeting &&
        (props as BriefingCardSuggestionProps).actionLinkText &&
        (props as BriefingCardSuggestionProps).actionLinkUrl && (
          <a
            href={(props as BriefingCardSuggestionProps).actionLinkUrl!}
            rel="noopener noreferrer"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {(props as BriefingCardSuggestionProps).actionLinkText} →
          </a>
        )}
    </article>
  );
}
