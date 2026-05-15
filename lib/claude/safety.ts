const BLOCKED_PATTERNS: RegExp[] = [
  /\b[0-9]{3,4}\s*(kcal|calories?|cal)\b/i,
  /stop\s+eating/i,
  /\b(buy|sell|invest\s+in)\s+\w+\s+(stock|share|crypto|coin)/i,
  /\bself[- ]harm\b/i,
];

const SAFE_FALLBACK = "Focus on consistency today — small steps compound.";

export function filterLlmOutput(content: string): { content: string; triggered: boolean } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      return { content: SAFE_FALLBACK, triggered: true };
    }
  }
  return { content, triggered: false };
}
