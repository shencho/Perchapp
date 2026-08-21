import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Hero */}
      <Skeleton className="h-36 rounded-xl" />
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      {/* Gráfico */}
      <Skeleton className="h-72 rounded-lg" />
      {/* Bloques */}
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}
