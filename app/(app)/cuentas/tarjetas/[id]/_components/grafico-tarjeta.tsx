"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface Props {
  /** Movimientos de la tarjeta (ARS), ya acotados a la ventana de meses. */
  movimientos: { fecha: string; monto: number }[];
  /** Mes actual YYYY-MM: separa histórico de comprometido a futuro. */
  mesActual: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

function labelMes(mesStr: string) {
  const d = new Date(`${mesStr}-01T12:00:00`);
  return d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }).replace(".", "");
}

const RANGOS = [
  { meses: 6, label: "6m" },
  { meses: 12, label: "12m" },
  { meses: 24, label: "24m" },
];

export function GraficoTarjeta({ movimientos, mesActual }: Props) {
  const [rango, setRango] = useState(12);

  const data = useMemo(() => {
    // Ventana centrada en el mes actual: mitad atrás, mitad adelante (cuotas ya cargadas).
    const atras = Math.ceil(rango / 2);
    const adelante = Math.floor(rango / 2);
    const base = new Date(`${mesActual}-01T12:00:00`);

    const meses: string[] = [];
    for (let i = -atras; i <= adelante; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const porMes: Record<string, number> = {};
    for (const m of movimientos) {
      const k = m.fecha.slice(0, 7);
      porMes[k] = (porMes[k] ?? 0) + m.monto;
    }

    // Acumulado del compromiso futuro: cuánto queda por pagar desde el mes actual.
    let acumFuturo = 0;
    return meses.map((mes) => {
      const gasto = porMes[mes] ?? 0;
      const esFuturo = mes > mesActual;
      if (mes >= mesActual) acumFuturo += gasto;
      return {
        mes,
        label: labelMes(mes),
        gasto,
        // El acumulado sólo se dibuja desde el mes actual en adelante.
        acumulado: mes >= mesActual ? acumFuturo : null,
        esFuturo,
      };
    });
  }, [movimientos, mesActual, rango]);

  const totalFuturo = data.filter((d) => d.esFuturo).reduce((a, d) => a + d.gasto, 0);
  const hayDatos = data.some((d) => d.gasto > 0);

  const pillBase = "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors";
  const pillActive = "bg-navy text-white border-navy";
  const pillInactive = "border-border text-muted-foreground hover:border-foreground/40";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Gasto por mes y compromiso futuro</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comprometido de acá en adelante: <span className="font-semibold text-foreground tabular-nums font-mono">{fmt(totalFuturo)}</span>
          </p>
        </div>
        <div className="flex gap-1.5">
          {RANGOS.map((r) => (
            <button
              key={r.meses}
              type="button"
              onClick={() => setRango(r.meses)}
              className={cn(pillBase, rango === r.meses ? pillActive : pillInactive)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {!hayDatos ? (
        <p className="text-sm text-muted-foreground py-10 text-center border border-dashed border-border rounded-lg">
          Todavía no hay consumos registrados con esta tarjeta.
        </p>
      ) : (
        <div className="h-72 w-full rounded-lg border border-border bg-card p-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
              <Tooltip
                formatter={(v, name) => [fmt(v as number), name === "gasto" ? "Gasto del mes" : "Acumulado a pagar"]}
                labelFormatter={(l) => String(l)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="gasto" name="gasto" fill="#1e3a5f" radius={[4, 4, 0, 0]} maxBarSize={38} />
              <Line
                type="monotone" dataKey="acumulado" name="acumulado"
                stroke="#c98a2b" strokeWidth={2} dot={false} connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Las barras muestran el gasto de cada mes (los meses futuros ya incluyen las cuotas cargadas).
        La línea es el acumulado que queda por pagar: cuando se aplana, tenés margen para un gasto grande.
      </p>
    </div>
  );
}
