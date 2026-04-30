"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getRegistros } from "@/lib/supabase/actions/registros";
import { getPagos } from "@/lib/supabase/actions/pagos";
import { calcularSaldoCliente } from "@/lib/domain/calcularSaldoCliente";
import type { RegistroConServicio } from "@/lib/supabase/actions/registros";
import type { PagoConCuenta } from "@/lib/supabase/actions/pagos";

interface Props {
  clienteId: string;
}

function formatMonto(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(n);
}

const ESTADO_CONFIG = {
  al_dia:    { label: "Al día",    className: "bg-green-900/30 text-green-400 border-green-800/40" },
  pendiente: { label: "Pendiente", className: "bg-amber-900/30 text-amber-400 border-amber-800/40" },
  atrasado:  { label: "Atrasado",  className: "bg-red-900/30 text-red-400 border-red-800/40" },
};

export function SaldoTab({ clienteId }: Props) {
  const [registros, setRegistros] = useState<RegistroConServicio[]>([]);
  const [pagos, setPagos]         = useState<PagoConCuenta[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getRegistros(clienteId), getPagos(clienteId)])
      .then(([r, p]) => { setRegistros(r); setPagos(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clienteId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Cargando…</p>;
  }

  const saldo    = calcularSaldoCliente(registros, pagos);
  const estadoCfg = ESTADO_CONFIG[saldo.estado];

  const impagos = registros
    .filter((r) => !r.pago_id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <div className="flex flex-col gap-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Facturado</span>
          <span className="text-lg font-semibold">{formatMonto(saldo.totalFacturado)}</span>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Cobrado</span>
          <span className="text-lg font-semibold text-green-400">{formatMonto(saldo.totalCobrado)}</span>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Pendiente</span>
          <span className={cn("text-lg font-semibold", saldo.saldoPendiente > 0 ? "text-amber-400" : "text-foreground")}>
            {formatMonto(saldo.saldoPendiente)}
          </span>
        </div>
      </div>

      {/* Estado badge */}
      <div className="flex items-center gap-3">
        <span className={cn("text-xs font-medium px-3 py-1 rounded-full border", estadoCfg.className)}>
          {estadoCfg.label}
        </span>
        {saldo.estado === "atrasado" && saldo.diasDeudaMasVieja !== null && (
          <span className="text-xs text-muted-foreground">
            Deuda más vieja: {saldo.diasDeudaMasVieja} días atrás
          </span>
        )}
        {saldo.estado === "pendiente" && saldo.diasDeudaMasVieja !== null && (
          <span className="text-xs text-muted-foreground">
            Hace {saldo.diasDeudaMasVieja} día{saldo.diasDeudaMasVieja !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Registros impagos */}
      {impagos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Registros sin cobrar</p>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {impagos.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm">{r.servicio_nombre ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.fecha}
                    {r.tipo && ` · ${r.tipo}`}
                    {r.cantidad && r.cantidad !== 1 && ` · ${r.cantidad} u.`}
                  </span>
                </div>
                <span className="text-sm font-medium text-amber-400">
                  {formatMonto(r.monto ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {saldo.saldoPendiente > 0 && (
        <Button variant="outline" size="sm" className="w-fit" disabled>
          <Bell className="h-4 w-4 mr-1.5" />
          Crear recordatorio de pago
        </Button>
      )}
    </div>
  );
}
