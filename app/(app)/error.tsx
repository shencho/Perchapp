"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sin esto, cualquier error de una action (varias hacen `throw new Error(...)`)
 * volaba hasta la raíz y se llevaba puesta toda la app.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center">
        <AlertTriangle className="h-6 w-6 text-danger" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          No pudimos cargar esta sección. Probá de nuevo; si sigue fallando, avisanos.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono pt-1">ref: {error.digest}</p>
        )}
      </div>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
