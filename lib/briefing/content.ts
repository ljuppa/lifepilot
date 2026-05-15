export const VALID_DOMAINS = new Set<string>(["health", "finance", "wellness"]);

export interface BriefingSuggestion {
  domain: string;
  title: string;
  body: string;
  action_link_text?: string | null;
  action_link_url?: string | null;
}

export interface BriefingContent {
  greeting: string;
  suggestions: BriefingSuggestion[];
  observation?: string | null;
}

export function isValidContent(value: unknown): value is BriefingContent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.greeting === "string" && Array.isArray(v.suggestions);
}

export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().trimStart();
  return lower.startsWith("/") || lower.startsWith("https://") || lower.startsWith("http://");
}
