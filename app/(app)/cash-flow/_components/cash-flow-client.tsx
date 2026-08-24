"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

interface Promedios {
  ingCorriente: number;
  egCorriente: number;
  ingNoCorriente: number;
  egNoCorriente: number;
}

interface Props {
  saldoInicial: number;
  promedios: Promedios;
  futurosPorMes?: Record<string, { ing: number; eg: number }>;
  moneda: "ARS" | "USD";
}

function fmt(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: moneda,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function labelMes(date: Date) {
  return date.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
}

function CustomTooltip({ active, payload, label, moneda }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  moneda: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums font-mono">
          {p.name}: {fmt(p.value, moneda)}
        </p>
      ))}
    </div>
  );
}

export function CashFlowClient({ saldoInicial, promedios, futurosPorMes = {}, moneda }: Props) {
  const [periodoMeses, setPeriodoMeses] = useState<1 | 3 | 6 | 12>(3);
  const [incluirFuturos, setIncluirFuturos] = useState(true);

  const proyeccion = useMemo(() => {
    const now = new Date();
    const base = Array.from({ length: periodoMeses }, (_, i) => {
      const fecha = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      const fut = incluirFuturos ? (futurosPorMes[key] ?? { ing: 0, eg: 0 }) : { ing: 0, eg: 0 };
      const ing = promedios.ingCorriente + fut.ing;
      const eg = promedios.egCorriente + fut.eg;
      return { label: labelMes(fecha), ingresos: ing, egresos: eg, neto: ing - eg };
    });
    // saldo acumulado (prefix sum, sin mutación de variables del render)
    return base.map((row, i) => ({
      ...row,
      saldo: saldoInicial + base.slice(0, i + 1).reduce((acc, r) => acc + r.neto, 0),
    }));
  }, [saldoInicial, periodoMeses, incluirFuturos, promedios, futurosPorMes]);

  const saldoFinal = proyeccion[proyeccion.length - 1]?.saldo ?? saldoInicial;
  const pillBase = "px-3 py-1 rounded-md text-xs font-medium border transition-colors";
  const pillActive = "border-primary bg-primary/10 text-primary";
  const pillInactive = "border-border text-muted-foreground hover:text-foreground hover:bg-surface";

  return (
    <div className="space-y-6">
      {/* KPI header */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground mb-1">
          Saldo proyectado en {periodoMeses} {periodoMeses === 1 ? "mes" : "meses"}
        </p>
        <p className={cn(
          "text-3xl font-bold tabular-nums font-mono",
          saldoFinal >= 0 ? "text-success" : "text-destructive"
        )}>
          {fmt(saldoFinal, moneda)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Saldo actual: {fmt(saldoInicial, moneda)}
          {" · "}
          <span className={cn(saldoFinal - saldoInicial >= 0 ? "text-success" : "text-destructive")}>
            {saldoFinal - saldoInicial >= 0 ? "+" : ""}{fmt(saldoFinal - saldoInicial, moneda)}
          </span>
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {([1, 3, 6, 12] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodoMeses(p)}
              className={cn(pillBase, periodoMeses === p ? pillActive : pillInactive)}
            >
              {p}m
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={incluirFuturos}
            onChange={e => setIncluirFuturos(e.target.checked)}
            className="rounded border-border"
          />
          Incluir cuotas y gastos futuros
        </label>
      </div>

      {/* Gráfico */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Saldo proyectado</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={proyeccion} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={fmtShort}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false} tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip moneda={moneda} />} />
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
            <Line
              type="monotone" dataKey="saldo" name="Saldo"
              stroke="#3b82f6" strokeWidth={2}
              dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Mes</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Ingresos</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Egresos</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Neto</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {proyeccion.map((row, i) => (
              <tr key={i} className="hover:bg-surface/30 transition-colors">
                <td className="px-4 py-2.5 font-medium">{row.label}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-mono text-success">{fmt(row.ingresos, moneda)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-mono text-destructive">{fmt(row.egresos, moneda)}</td>
                <td className={cn(
                  "px-4 py-2.5 text-right tabular-nums font-mono font-medium",
                  row.neto >= 0 ? "text-success" : "text-destructive"
                )}>
                  {row.neto >= 0 ? "+" : ""}{fmt(row.neto, moneda)}
                </td>
                <td className={cn(
                  "px-4 py-2.5 text-right tabular-nums font-mono font-semibold",
                  row.saldo >= 0 ? "text-foreground" : "text-destructive"
                )}>
                  {fmt(row.saldo, moneda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Promedio de los últimos 3 meses + cuotas y gastos futuros ya cargados. Solo {moneda}. Estimado.
      </p>
    </div>
  );
}
