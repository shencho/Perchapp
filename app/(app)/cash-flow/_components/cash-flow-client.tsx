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
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {fmt(p.value, moneda)}
        </p>
      ))}
    </div>
  );
}

export function CashFlowClient({ saldoInicial, promedios, moneda }: Props) {
  const [periodoMeses, setPeriodoMeses] = useState<1 | 3 | 6 | 12>(3);
  const [incluirNoCorrientes, setIncluirNoCorrientes] = useState(false);

  const proyeccion = useMemo(() => {
    const now = new Date();
    let saldo = saldoInicial;
    return Array.from({ length: periodoMeses }, (_, i) => {
      const fecha = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const ing = promedios.ingCorriente + (incluirNoCorrientes ? promedios.ingNoCorriente : 0);
      const eg = promedios.egCorriente + (incluirNoCorrientes ? promedios.egNoCorriente : 0);
      const neto = ing - eg;
      saldo += neto;
      return { label: labelMes(fecha), ingresos: ing, egresos: eg, neto, saldo };
    });
  }, [saldoInicial, periodoMeses, incluirNoCorrientes, promedios]);

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
          "text-3xl font-bold tabular-nums",
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
            checked={incluirNoCorrientes}
            onChange={e => setIncluirNoCorrientes(e.target.checked)}
            className="rounded border-border"
          />
          Incluir no corrientes
        </label>
      </div>

      {/* Gráfico */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Saldo proyectado</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={proyeccion} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tickFormatter={fmtShort}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false} tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip moneda={moneda} />} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />
            <Line
              type="monotone" dataKey="saldo" name="Saldo"
              stroke="hsl(var(--primary))" strokeWidth={2}
              dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
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
                <td className="px-4 py-2.5 text-right tabular-nums text-success">{fmt(row.ingresos, moneda)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-destructive">{fmt(row.egresos, moneda)}</td>
                <td className={cn(
                  "px-4 py-2.5 text-right tabular-nums font-medium",
                  row.neto >= 0 ? "text-success" : "text-destructive"
                )}>
                  {row.neto >= 0 ? "+" : ""}{fmt(row.neto, moneda)}
                </td>
                <td className={cn(
                  "px-4 py-2.5 text-right tabular-nums font-semibold",
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
        Proyección basada en el promedio de los últimos 3 meses. Solo {moneda}. Los valores son estimados.
      </p>
    </div>
  );
}
