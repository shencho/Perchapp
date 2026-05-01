"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NamedSelect } from "@/components/ui/named-select";
import { editarPago } from "@/lib/supabase/actions/prestamos-pagos";
import type { Cuenta } from "@/types/supabase";
import type { PrestamoPagoConMovimiento } from "@/lib/supabase/actions/prestamos-pagos";

interface Props {
  open: boolean;
  onClose: () => void;
  pago: PrestamoPagoConMovimiento;
  moneda: string;
  cuentas: Cuenta[];
}

export function EditarPagoPrestamoModal({ open, onClose, pago, moneda, cuentas }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fecha, setFecha]     = useState(pago.fecha);
  const [monto, setMonto]     = useState(String(pago.monto));
  const [cuentaId, setCuentaId] = useState(pago.movimientos?.cuenta_id ?? "");
  const [notas, setNotas]     = useState(pago.notas ?? "");

  useEffect(() => {
    if (open) {
      setFecha(pago.fecha);
      setMonto(String(pago.monto));
      setCuentaId(pago.movimientos?.cuenta_id ?? "");
      setNotas(pago.notas ?? "");
      setError(null);
    }
  }, [open, pago]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) { setError("El monto debe ser mayor a 0"); return; }

    setSubmitting(true);
    try {
      await editarPago(pago.id, {
        fecha,
        monto: montoNum,
        cuentaId: cuentaId || null,
        notas: notas.trim() || null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Editar pago</h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha</label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Monto ({moneda})</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Cuenta <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <NamedSelect
                options={cuentas.map((c) => ({ value: c.id, label: c.nombre }))}
                value={cuentaId}
                onValueChange={(v) => setCuentaId(v ?? "")}
                placeholder="Sin especificar"
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Notas <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones…"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
