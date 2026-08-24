import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback de todo el grupo (app). Sin esto, Next no puede pintar NADA hasta que
 * termina el render del servidor: la pantalla queda congelada en la página vieja.
 * Además habilita el prefetch de <Link>, que en rutas dinámicas sin loading.tsx
 * no precarga absolutamente nada.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
