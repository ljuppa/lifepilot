import { BriefingCardSkeleton } from "@/components/briefing/BriefingCardSkeleton";

export default function BriefingDetailLoading() {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-10 space-y-4">
      <BriefingCardSkeleton />
      <BriefingCardSkeleton />
      <BriefingCardSkeleton />
    </div>
  );
}
