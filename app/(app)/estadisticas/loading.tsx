import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl animate-in fade-in duration-200">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-14 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
