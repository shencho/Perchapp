"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";
import { ajustarValorInversion } from "@/lib/supabase/actions/ajuste-inversion";
import { cn } from "@/lib/utils";

function fmt(n: number, moneda: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  cuentaId: string;
  cuentaNombre: string;
  saldoActual: number;
  moneda: string;
}

export function ActualizarValorModal({ cuentaId, cuentaNombre, saldoActual, moneda }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [nuevoSaldo, setNuevoSaldo] = useState(saldoActual);
  const [fecha, setFecha] = useState(today);
  const [notas, setNotas] = useState("");

  const diferencia = nuevoSaldo - saldoActual;

  function handleOpen() {
    setNuevoSaldo(saldoActual);
    setFecha(today);
    setNotas("");
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (diferencia === 0) { setOpen(false); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      await ajustarValorInversion({ cuentaId, saldoActual, nuevoSaldo, fecha, notas: notas || null });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
        Actualizar valor
      </Button>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={`Actualizar valor: ${cuentaNombre}`}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-surface/30 px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Saldo actual</span>
            <span className="font-semibold tabular-nums">{fmt(saldoActual, moneda)}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nuevo-saldo">Nuevo saldo ({moneda})</Label>
            <Input
              id="nuevo-saldo"
              type="number"
              min="0"
              step="0.01"
              value={nuevoSaldo}
              onChange={e => setNuevoSaldo(parseFloat(e.target.value) || 0)}
              autoFocus
            />
            {diferencia !== 0 && (
              <p className={cn(
                "text-sm font-medium tabular-nums",
                diferencia > 0 ? "text-green-400" : "text-red-400"
              )}>
                {diferencia > 0 ? "+" : ""}{fmt(diferencia, moneda)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ajuste-fecha">Fecha</Label>
            <Input
              id="ajuste-fecha"
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ajuste-notas">
              Notas <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="ajuste-notas"
              placeholder="Ej. Precio de mercado al 01/05"
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </FormDialog>
    </>
  );
}
