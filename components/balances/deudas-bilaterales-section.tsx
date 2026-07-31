"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ArrowDownLeft, Check, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import {
  marcarDeudaPagada,
  rechazarDeuda,
  confirmarDeuda,
} from "@/lib/supabase/actions/deudas";
import type { DeudaCompartida } from "@/types/supabase";

interface Props {
  debo: DeudaCompartida[];        // yo soy deudor
  meDeben: DeudaCompartida[];     // yo soy acreedor
  cuentas: { id: string; nombre: string }[];
}

function fmt(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function DeudasBilateralesSection({ debo, meDeben, cuentas }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal de confirmación (acreedor)
  const [confirmModal, setConfirmModal] = useState<DeudaCompartida | null>(null);
  const [fecha, setFecha] = useState(todayStr());
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const deboActivas = debo.filter((d) => d.estado === "pendiente" || d.estado === "pago_marcado");
  const meDebenActivas = meDeben.filter((d) => d.estado === "pendiente" || d.estado === "pago_marcado");

  if (deboActivas.length === 0 && meDebenActivas.length === 0) return null;

  async function run(id: string, fn: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  function openConfirm(d: DeudaCompartida) {
    setConfirmModal(d);
    setFecha(todayStr());
    setCuentaId(null);
    setObs("");
    setError(null);
  }

  async function handleConfirm() {
    if (!confirmModal) return;
    setSubmitting(true);
    setError(null);
    try {
      await confirmarDeuda({
        deudaId: confirmModal.id,
        cuentaDestinoId: cuentaId,
        fecha,
        observacion: obs.trim() || null,
      });
      setConfirmModal(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al confirmar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Con usuarios de Perchapp</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Deudas conectadas — se concilian de los dos lados.
        </p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Debo */}
      {deboActivas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5 text-danger" /> Debo
          </p>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {deboActivas.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm">
                    <span className="font-semibold text-danger tabular-nums font-mono">
                      {fmt(d.monto, d.moneda)}
                    </span>{" "}
                    a {d.acreedor_nombre ?? "usuario"}
                  </span>
                  {d.concepto && (
                    <span className="text-xs text-muted-foreground truncate">{d.concepto}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {d.estado === "pendiente" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => run(d.id, () => marcarDeudaPagada({ deudaId: d.id }))}
                        disabled={busyId === d.id}
                      >
                        Marqué que pagué
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => run(d.id, () => rechazarDeuda(d.id))}
                        disabled={busyId === d.id}
                        title="Rechazar"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-warning">
                      <Clock className="h-3.5 w-3.5" /> Esperando confirmación
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Me deben */}
      {meDebenActivas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <ArrowDownLeft className="h-3.5 w-3.5 text-success" /> Me deben
          </p>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {meDebenActivas.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm">
                    <span className="font-semibold text-success tabular-nums font-mono">
                      {fmt(d.monto, d.moneda)}
                    </span>{" "}
                    de {d.deudor_nombre ?? "usuario"}
                  </span>
                  {d.concepto && (
                    <span className="text-xs text-muted-foreground truncate">{d.concepto}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {d.estado === "pago_marcado" ? (
                    <Button size="sm" onClick={() => openConfirm(d)} disabled={busyId === d.id}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Confirmar que recibí
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> Esperando que pague
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal confirmar recibí */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !submitting && setConfirmModal(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Confirmar cobro</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setConfirmModal(null)} disabled={submitting}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Se registrará un ingreso de{" "}
              <span className="font-semibold text-success">
                {fmt(confirmModal.monto, confirmModal.moneda)}
              </span>{" "}
              y {confirmModal.deudor_nombre ?? "el otro usuario"} verá el egreso en su cuenta.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cuenta destino</Label>
                <NamedSelect
                  options={cuentas.map((c) => ({ value: c.id, label: c.nombre }))}
                  value={cuentaId ?? ""}
                  onValueChange={(v) => setCuentaId(v || null)}
                  placeholder="Opcional…"
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Observación (opcional)</Label>
                <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ej. Transferencia recibida" />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="ghost" onClick={() => setConfirmModal(null)} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={submitting || !fecha}>
                {submitting ? "Procesando…" : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
