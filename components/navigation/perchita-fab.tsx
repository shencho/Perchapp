"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center text-2xl z-40 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "#1e3a5f" }}
        aria-label="MANGO AI — Capturar movimiento"
      >
        🥭
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <CapturaSheetContent
          onSuccess={handleSuccess}
          cachedData={cachedData}
          onDataFetched={setCachedData}
        />
      </SheetContent>
    </Sheet>
  );
}
