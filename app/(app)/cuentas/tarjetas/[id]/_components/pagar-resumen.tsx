"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { pagarTarjeta, type ResumenTarjeta } from "@/lib/supabase/actions/pagos-tarjeta";

interface Props {
  tarjetaId: string;
  tarjetaNombre: string;
  cuentas: { id: string; nombre: string; moneda: string }[];
  cuentaPagoDefault: string | null;
  resumen: ResumenTarjeta;
}

function fmt(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: moneda, maximumFractionDigits: 2 }).format(n);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PagarResumen({ tarjetaId, tarjetaNombre, cuentas, cuentaPagoDefault, resumen }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState(todayStr());
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Un bloque por moneda con consumos. Cada una tiene su cuenta y su monto,
  // para poder pagar una sola o las dos, total o parcial.
  const bloques = useMemo(
    () => Object.entries(resumen.porMoneda)
      .filter(([, v]) => v.total > 0)
      .sort(([a], [b]) => (a === "ARS" ? -1 : b === "ARS" ? 1 : a.localeCompare(b))),
    [resumen.porMoneda],
  );

  const [cuentaPorMoneda, setCuentaPorMoneda] = useState<Record<string, string | null>>(() => {
    const def = cuentas.find((c) => c.id === cuentaPagoDefault);
    return Object.fromEntries(
      Object.keys(resumen.porMoneda).map((moneda) => [
        moneda,
        def?.moneda === moneda ? def.id : (cuentas.find((c) => c.moneda === moneda)?.id ?? null),
      ]),
    );
  });

  const [montoPorMoneda, setMontoPorMoneda] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(resumen.porMoneda).map(([m, v]) => [m, v.aPagar > 0 ? String(v.aPagar) : ""]),
    ),
  );

  function montoDe(moneda: string) {
    const n = parseFloat((montoPorMoneda[moneda] ?? "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  const cuantosPagos = bloques.filter(([moneda]) => montoDe(moneda) > 0).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const aRegistrar = bloques
      .map(([moneda]) => ({ moneda, monto: montoDe(moneda), cuentaId: cuentaPorMoneda[moneda] }))
      .filter((x) => x.monto > 0);

    if (aRegistrar.length === 0) {
      setError("Ingresá cuánto pagás en al menos una moneda.");
      return;
    }
    const sinCuenta = aRegistrar.find((x) => !x.cuentaId);
    if (sinCuenta) {
      setError(`Elegí la cuenta para el pago en ${sinCuenta.moneda}.`);
      return;
    }

    setSaving(true);
    // Un movimiento por moneda: los saldos de cada cuenta se mueven en la suya.
    for (const x of aRegistrar) {
      const pendiente = resumen.porMoneda[x.moneda]?.aPagar ?? 0;
      const obs = [
        `Resumen ${fmt(pendiente, x.moneda)}`,
        x.monto < pendiente ? "pago parcial" : null,
        observacion.trim() || null,
      ].filter(Boolean).join(" · ");

      const res = await pagarTarjeta({
        tarjetaId,
        cuentaId: x.cuentaId as string,
        monto: x.monto,
        moneda: x.moneda,
        fecha,
        vencimiento: resumen.vencimiento,
        observacion: obs,
      });
      if ("error" in res) {
        setSaving(false);
        setError(res.error);
        return;
      }
    }

    setSaving(false);
    setOpen(false);
    setObservacion("");
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Wallet className="h-4 w-4 mr-1" /> Pagar resumen
      </Button>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={`Pagar resumen · ${tarjetaNombre}`}
        description={resumen.vencimiento
          ? `Vence el ${new Date(resumen.vencimiento + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "long" })}`
          : undefined}
        onSubmit={handleSubmit}
        isSubmitting={saving}
        submitLabel={cuantosPagos > 1 ? "Registrar pagos" : "Registrar pago"}
      >
        {bloques.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Esta tarjeta no tiene consumos en el ciclo actual.
          </p>
        )}

        {bloques.map(([moneda, v]) => {
          const cuentasMoneda = cuentas.filter((c) => c.moneda === moneda);
          const monto = montoDe(moneda);
          const dif = Math.round((monto - v.aPagar) * 100) / 100;
          return (
            <div key={moneda} className="rounded-[var(--radius-card)] border border-border p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{moneda}</span>
                <span className="text-xs text-muted-foreground">
                  Consumos: <span className="tabular-nums font-mono">{fmt(v.total, moneda)}</span>
                </span>
              </div>

              {(v.yaDescontado > 0 || v.yaPagado > 0) && (
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  {v.yaDescontado > 0 && (
                    <div className="flex justify-between">
                      <span>Ya descontado de cuentas</span>
                      <span className="tabular-nums font-mono">− {fmt(v.yaDescontado, moneda)}</span>
                    </div>
                  )}
                  {v.yaPagado > 0 && (
                    <div className="flex justify-between">
                      <span>Ya pagado en este ciclo</span>
                      <span className="tabular-nums font-mono">− {fmt(v.yaPagado, moneda)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-sm font-medium border-t border-border pt-2">
                <span>Pendiente</span>
                <span className="tabular-nums font-mono">{fmt(v.aPagar, moneda)}</span>
              </div>

              {cuentasMoneda.length === 0 ? (
                <p className="text-xs text-warning">
                  No tenés ninguna cuenta en {moneda} para registrar este pago.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cuenta</Label>
                    <NamedSelect
                      options={cuentasMoneda.map((c) => ({ value: c.id, label: c.nombre }))}
                      value={cuentaPorMoneda[moneda] ?? ""}
                      onValueChange={(val) => setCuentaPorMoneda((s) => ({ ...s, [moneda]: val || null }))}
                      placeholder="Elegí una cuenta"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Monto a pagar</Label>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0"
                      value={montoPorMoneda[moneda] ?? ""}
                      onChange={(e) => setMontoPorMoneda((s) => ({ ...s, [moneda]: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {monto > 0 && dif !== 0 && (
                <p className="text-xs text-muted-foreground">
                  {dif > 0
                    ? `${fmt(dif, moneda)} más que el pendiente.`
                    : `Pago parcial: quedan ${fmt(Math.abs(dif), moneda)}.`}
                </p>
              )}
            </div>
          );
        })}

        <div className="space-y-1.5">
          <Label>Fecha del pago</Label>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full sm:w-44" />
        </div>

        <div className="space-y-1.5">
          <Label>Observación (opcional)</Label>
          <Input
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Ej. incluye consumo no cargado"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </FormDialog>
    </>
  );
}
