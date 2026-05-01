"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NamedSelect } from "@/components/ui/named-select";
import { registrarPago } from "@/lib/supabase/actions/prestamos-pagos";
import type { Cuenta } from "@/types/supabase";
import type { PrestamoConPagos } from "@/lib/supabase/actions/prestamos";

interface Props {
  open: boolean;
  onClose: () => void;
  prestamo: PrestamoConPagos;
  saldoPendiente: number;
  cuotasSiguiente?: number;
  cuentas: Cuenta[];
}

function formatMonto(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function RegistrarPagoPrestamoModal({
  open,
  onClose,
  prestamo,
  saldoPendiente,
  cuotasSiguiente,
  cuentas,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sobrepago, setSobrepago] = useState(false);

  const defaultMonto =
    prestamo.tipo === "bancario" && prestamo.cuota_mensual
      ? String(prestamo.cuota_mensual)
      : saldoPendiente > 0
      ? String(saldoPendiente)
      : "";

  const [fecha, setFecha]           = useState(new Date().toISOString().slice(0, 10));
  const [monto, setMonto]           = useState(defaultMonto);
  const [cuentaId, setCuentaId]     = useState("");
  const [cuotaNumero, setCuotaNumero] = useState(cuotasSiguiente ? String(cuotasSiguiente) : "");
  const [notas, setNotas]           = useState("");

  useEffect(() => {
    if (open) {
      setFecha(new Date().toISOString().slice(0, 10));
      setMonto(defaultMonto);
      setCuentaId("");
      setCuotaNumero(cuotasSiguiente ? String(cuotasSiguiente) : "");
      setNotas("");
      setError(null);
      setSobrepago(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleMontoChange(val: string) {
    setMonto(val);
    const num = parseFloat(val);
    setSobrepago(!isNaN(num) && num > saldoPendiente && saldoPendiente > 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) { setError("El monto debe ser mayor a 0"); return; }

    setSubmitting(true);
    try {
      await registrarPago({
        prestamoId: prestamo.id,
        fecha,
        monto: montoNum,
        cuentaId: cuentaId || null,
        cuotaNumero: cuotaNumero ? parseInt(cuotaNumero) : null,
        notas: notas.trim() || null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar pago");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const esBancario = prestamo.tipo === "bancario";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Registrar pago</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Saldo pendiente: <span className="tabular-nums">{formatMonto(saldoPendiente, prestamo.moneda)}</span>
            </p>
          </div>

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
                <label className="text-sm font-medium">Monto ({prestamo.moneda})</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monto}
                  onChange={(e) => handleMontoChange(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Warning de sobrepago */}
            {sobrepago && (
              <div className="rounded-md border border-amber-800/60 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
                ⚠ Este pago ({formatMonto(parseFloat(monto) || 0, prestamo.moneda)}) excede el saldo pendiente ({formatMonto(saldoPendiente, prestamo.moneda)}).
                ¿Es un sobrepago intencional (interés informal, redondeo)?
                Podés guardarlo igual.
              </div>
            )}

            {/* Número de cuota (bancario) */}
            {esBancario && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Número de cuota <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={cuotaNumero}
                  onChange={(e) => setCuotaNumero(e.target.value)}
                  placeholder="Auto"
                />
              </div>
            )}

            {/* Cuenta */}
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

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Notas <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. Transferencia del lunes…"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando…" : "Registrar pago"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
