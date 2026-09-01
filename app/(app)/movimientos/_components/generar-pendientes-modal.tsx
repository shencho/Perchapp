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
      <DialogContent className="sm:max-w-2xl flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Generar movimientos pendientes</DialogTitle>
        </DialogHeader>

        {plantillasPendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay plantillas pendientes para este mes.
          </p>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {/* Mobile: una tarjeta por plantilla. La tabla de 5 columnas con dos
                inputs no entra en un teléfono ni con scroll horizontal. */}
            <div className="sm:hidden space-y-3">
              {plantillasPendientes.map(({ plantilla: p, diasRestantes, atrasada, fechaEsperada }) => (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-[var(--radius-card)] border border-border p-3 space-y-2",
                    !checked[p.id] && "opacity-60",
                  )}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!checked[p.id]}
                      onChange={e => setChecked(prev => ({ ...prev, [p.id]: e.target.checked }))}
                      className="h-4 w-4 mt-0.5 rounded accent-primary shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium">{p.nombre}</span>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded border font-medium",
                          p.tipo === "Ingreso"
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-danger/10 text-danger border-danger/20",
                        )}>
                          {p.tipo ?? "Egreso"}
                        </span>
                      </span>
                      {atrasada ? (
                        <span className="flex items-center gap-1 text-xs text-warning mt-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          Atrasada {Math.abs(diasRestantes)}d · {fmtFecha(fechaEsperada)}
                        </span>
                      ) : (
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {fmtFecha(fechaEsperada)}
                          {diasRestantes === 0 ? " · hoy" : ` · en ${diasRestantes}d`}
                        </span>
                      )}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number" min={0} step="0.01"
                      value={montos[p.id] ?? p.monto_estimado}
                      onChange={e => setMontos(prev => ({ ...prev, [p.id]: e.target.valueAsNumber }))}
                      className="w-32 text-right tabular-nums font-mono h-9"
                      disabled={!checked[p.id]}
                    />
                    <Input
                      value={descripciones[p.id] ?? ""}
                      onChange={e => setDescrip(prev => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="Descripción"
                      className="h-9 flex-1 min-w-0"
                      disabled={!checked[p.id]}
                    />
                  </div>
                </div>
              ))}
            </div>

            <table className="hidden sm:table w-full text-sm">
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
                      <div className="flex items-center gap-1.5 leading-tight">
                        <span className="font-medium">{p.nombre}</span>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded border font-medium shrink-0",
                          p.tipo === "Ingreso"
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-danger/10 text-danger border-danger/20"
                        )}>
                          {p.tipo ?? "Egreso"}
                        </span>
                      </div>
                      {atrasada ? (
                        <div className="flex items-center gap-1 text-xs text-warning mt-0.5">
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
                        className="w-28 text-right tabular-nums font-mono h-8"
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

        <DialogFooter className="shrink-0">
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
