export default function BriefingHistoryLoading() {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-10 space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse h-16 rounded-xl bg-coach-observation" />
      ))}
    </div>
  );
}
