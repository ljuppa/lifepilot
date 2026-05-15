interface AiDisclosureWrapperProps {
  children: React.ReactNode;
}

export function AiDisclosureWrapper({ children }: AiDisclosureWrapperProps) {
  return (
    <div>
      {children}
      <div className="mt-6 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          ✦ AI-generated — not medical, nutritional, or financial advice.
        </p>
      </div>
    </div>
  );
}
