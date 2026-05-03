"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { generarMovimientosDePlantillas } from "@/lib/supabase/actions/plantillas";
import type { PlantillaConEstado } from "@/lib/domain/plantillas";

interface Props {
  open: boolean;
  onClose: () => void;
  plantillasPendientes: PlantillaConEstado[];
  initialSelectedId?: string;
}

function fmtFecha(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-AR", {
    day: "2-digit", month: "short",
  });
}

export function GenerarPendientesModal({
  open, onClose, plantillasPendientes, initialSelectedId,
}: Props) {
  const router = useRouter();
  const [montos, setMontos]           = useState<Record<string, number>>({});
  const [descripciones, setDescrip]   = useState<Record<string, string>>({});
  const [checked, setChecked]         = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Inicializar estado cuando cambian las plantillas o se abre el modal
  useEffect(() => {
    if (!open) return;
    const m: Record<string, number>  = {};
    const d: Record<string, string>  = {};
    const c: Record<string, boolean> = {};
    plantillasPendientes.forEach(({ plantilla: p }) => {
      m[p.id] = p.monto_estimado;
      d[p.id] = "";
      c[p.id] = initialSelectedId ? p.id === initialSelectedId : true;
    });
    setMontos(m);
    setDescrip(d);
    setChecked(c);
    setError(null);
  }, [open, plantillasPendientes, initialSelectedId]);

  const seleccionados = plantillasPendientes.filter(({ plantilla: p }) => checked[p.id]);

  async function handleConfirmar() {
    if (seleccionados.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await generarMovimientosDePlantillas(
        seleccionados.map(({ plantilla: p, fechaEsperada }) => ({
          plantillaId: p.id,
          monto:       montos[p.id] ?? p.monto_estimado,
          descripcion: descripciones[p.id] ?? "",
          fecha:       fechaEsperada,
        })),
      );
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar movimientos");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generar movimientos pendientes</DialogTitle>
        </DialogHeader>

        {plantillasPendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay plantillas pendientes para este mes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-3 text-left w-6"></th>
                  <th className="py-2 pr-3 text-left">Plantilla</th>
                  <th className="py-2 pr-3 text-center w-16">Día</th>
                  <th className="py-2 pr-3 text-right w-28">Monto</th>
                  <th className="py-2 text-left">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {plantillasPendientes.map(({ plantilla: p, diasRestantes, atrasada, fechaEsperada }) => (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-b border-border/50 last:border-0",
                      !checked[p.id] && "opacity-50",
                    )}
                  >
                    <td className="py-2.5 pr-3">
                      <input
                        type="checkbox"
                        checked={!!checked[p.id]}
                        onChange={e => setChecked(prev => ({ ...prev, [p.id]: e.target.checked }))}
                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium leading-tight">{p.nombre}</div>
                      {atrasada ? (
                        <div className="flex items-center gap-1 text-xs text-orange-400 mt-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          Atrasada {Math.abs(diasRestantes)}d · {fmtFecha(fechaEsperada)}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {fmtFecha(fechaEsperada)}
                          {diasRestantes === 0 ? " · hoy" : ` · en ${diasRestantes}d`}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-center text-muted-foreground">
                      {p.dia_mes}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={montos[p.id] ?? p.monto_estimado}
                        onChange={e => setMontos(prev => ({ ...prev, [p.id]: e.target.valueAsNumber }))}
                        className="w-28 text-right tabular-nums h-8"
                        disabled={!checked[p.id]}
                      />
                    </td>
                    <td className="py-2.5">
                      <Input
                        value={descripciones[p.id] ?? ""}
                        onChange={e => setDescrip(prev => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="Ej. Edenor abr-2026"
                        className="h-8"
                        disabled={!checked[p.id]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={isSubmitting || seleccionados.length === 0}
          >
            {isSubmitting
              ? "Creando..."
              : `Crear ${seleccionados.length > 0 ? `${seleccionados.length} ` : ""}movimiento${seleccionados.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
