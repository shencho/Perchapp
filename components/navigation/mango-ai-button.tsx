"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MangoMark } from "@/components/ui/mango-logo";
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
        className="w-full flex items-center gap-2.5 pl-2.5 pr-3 py-2.5 rounded-[15px] bg-navy text-cream text-left shadow-[var(--shadow-raised)] transition-[transform,background-color] duration-150 hover:bg-navy-hover active:scale-[0.98]"
        aria-label={`Abrir ${asistenteNombre}`}
      >
        <MangoMark size={36} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-sm font-semibold truncate">{asistenteNombre}</span>
          <span className="block text-[11px] text-cream/70">Cargar movimiento</span>
        </span>
        <span aria-hidden className="text-lg leading-none text-cream/80">+</span>
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
