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
  const [cuentaId, setCuentaId] = useState<string | null>(cuentaPagoDefault ?? cuentas[0]?.id ?? null);
  const [fecha, setFecha] = useState(todayStr());
  const [ajuste, setAjuste] = useState<string>("");
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cuenta = cuentas.find((c) => c.id === cuentaId);
  const moneda = cuenta?.moneda ?? "ARS";
  const delCiclo = resumen.porMoneda[moneda] ?? { total: 0, yaDescontado: 0, aPagar: 0 };

  const ajusteNum = useMemo(() => {
    const n = parseFloat(ajuste.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [ajuste]);
  const montoFinal = Math.round((delCiclo.aPagar + ajusteNum) * 100) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!cuentaId) { setError("Elegí la cuenta desde la que pagás."); return; }
    if (!(montoFinal > 0)) { setError("El monto a pagar debe ser mayor a 0."); return; }
    setSaving(true);
    const obs = [
      `Resumen ${fmt(delCiclo.aPagar, moneda)}`,
      ajusteNum !== 0 ? `ajuste ${ajusteNum > 0 ? "+" : ""}${fmt(ajusteNum, moneda)}` : null,
      observacion.trim() || null,
    ].filter(Boolean).join(" · ");

    const res = await pagarTarjeta({
      tarjetaId, cuentaId, monto: montoFinal, moneda, fecha,
      vencimiento: resumen.vencimiento, observacion: obs,
    });
    setSaving(false);
    if ("error" in res) { setError(res.error); return; }
    setOpen(false);
    setAjuste("");
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
        submitLabel="Registrar pago"
      >
        <div className="space-y-1.5">
          <Label>Cuenta desde la que pagás</Label>
          <NamedSelect
            options={cuentas.map((c) => ({ value: c.id, label: `${c.nombre} (${c.moneda})` }))}
            value={cuentaId ?? ""}
            onValueChange={(v) => setCuentaId(v || null)}
            placeholder="Elegí una cuenta"
          />
        </div>

        {/* Resumen del ciclo */}
        <div className="rounded-lg border border-border bg-surface p-3 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Consumos del ciclo</span>
            <span className="tabular-nums font-mono">{fmt(delCiclo.total, moneda)}</span>
          </div>
          {delCiclo.yaDescontado > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Ya descontado de cuentas</span>
              <span className="tabular-nums font-mono">− {fmt(delCiclo.yaDescontado, moneda)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm font-medium border-t border-border pt-1 mt-1">
            <span>Resumen a pagar</span>
            <span className="tabular-nums font-mono">{fmt(delCiclo.aPagar, moneda)}</span>
          </div>
          {delCiclo.yaDescontado > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Se excluyen los consumos cargados con una cuenta: esa plata ya salió del banco al comprarse.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Ajuste (+ / −)</Label>
            <Input
              type="number" step="0.01" inputMode="decimal" placeholder="0"
              value={ajuste} onChange={(e) => setAjuste(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Por consumos que falten cargar.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha del pago</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <span className="text-sm font-medium">Total a pagar</span>
          <span className="text-lg font-bold tabular-nums font-mono">{fmt(montoFinal, moneda)}</span>
        </div>

        <div className="space-y-1.5">
          <Label>Observación (opcional)</Label>
          <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej. incluye consumo no cargado" />
        </div>

        {resumen.yaPagado.length > 0 && (
          <p className="text-xs text-warning">
            Ya registraste un pago para este ciclo ({resumen.yaPagado.map((p) => fmt(p.monto, p.moneda)).join(", ")}).
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </FormDialog>
    </>
  );
}
