"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MangoMark } from "@/components/ui/mango-logo";
import { CapturaSheetContent, type CapturaData } from "./captura-sheet-content";

export function PerchitaFAB() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [cachedData, setCachedData] = useState<CapturaData | null>(null);

  if (pathname === "/captura") return null;

  function handleSuccess() {
    setOpen(false);
    toast.success("Movimiento creado");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="md:hidden fixed bottom-[18px] left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center z-40 shadow-[var(--shadow-raised)] transition-transform duration-150 active:scale-95"
        aria-label="MANGO AI — Capturar movimiento"
      >
        <MangoMark size={58} />
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-[var(--radius-sheet)]">
        <CapturaSheetContent
          onSuccess={handleSuccess}
          cachedData={cachedData}
          onDataFetched={setCachedData}
        />
      </SheetContent>
    </Sheet>
  );
}
