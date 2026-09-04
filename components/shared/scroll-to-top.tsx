"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botón para volver al principio de la lista.
 *
 * El scroll es el del DOCUMENTO (el layout no tiene ningún contenedor con
 * overflow), así que se escucha `window`.
 *
 * Va abajo a la IZQUIERDA: la esquina derecha ya la ocupan el mango del FAB y,
 * en mobile, la barra inferior. Y respeta `safe-area-inset-bottom`, si no en un
 * iPhone queda debajo del indicador de home.
 */
export function ScrollToTop({ desde = 600 }: { desde?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > desde);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [desde]);

  return (
    <button
      type="button"
      aria-label="Volver arriba"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed left-4 z-40 h-11 w-11 rounded-full border border-border bg-card",
        "flex items-center justify-center text-muted-foreground",
        "shadow-[var(--shadow-raised)] transition-[opacity,transform] duration-150",
        "hover:text-foreground active:scale-95",
        // Arriba de la barra inferior en mobile; pegado al borde en desktop.
        "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6",
        visible ? "opacity-100" : "pointer-events-none opacity-0 translate-y-2",
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
