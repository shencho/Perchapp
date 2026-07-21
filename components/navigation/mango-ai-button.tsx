"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CapturaSheetContent, type CapturaData } from "./captura-sheet-content";

interface Props {
  asistenteNombre: string;
}

export function MangoAIButton({ asistenteNombre }: Props) {
  const [open, setOpen] = useState(false);
  const [cachedData, setCachedData] = useState<CapturaData | null>(null);

  function handleSuccess() {
    setOpen(false);
    toast.success("Movimiento creado");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-navy text-cream transition-colors hover:bg-navy-hover"
        aria-label={`Abrir ${asistenteNombre}`}
      >
        <span>🥭</span>
        <span>{asistenteNombre}</span>
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
