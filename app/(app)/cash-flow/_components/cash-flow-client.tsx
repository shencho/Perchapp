"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { proyectar, baseRecurrente, type MesResumen } from "@/lib/domain/cashflow";

interface Props {
  mesActual: string;
  monedas: string[];
  saldoInicial: Record<string, number>;
  porMoneda: Record<string, MesResumen[]>;
}

function fmt(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: moneda,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtShort(n: number, moneda = "ARS") {
  const sig = moneda === "USD" ? "US$" : "$";
  if (Math.abs(n) >= 1_000_000) return `${sig}${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${sig}${Math.round(n / 1_000)}K`;
  return `${sig}${Math.round(n)}`;
}

function labelMes(mes: string) {
  return new Date(`${mes}-01T12:00:00`)
    .toLocaleDateString("es-AR", { month: "short", year: "2-digit" })
    .replace(".", "");
}

const HORIZONTES = [3, 6, 12];

export function CashFlowClient({ mesActual, monedas, saldoInicial, porMoneda }: Props) {
  const [moneda, setMoneda] = useState(monedas[0] ?? "ARS");
  const [horizonte, setHorizonte] = useState(6);
  const [incluirCompromisos, setIncluirCompromisos] = useState(true);

  const filas = useMemo(() => porMoneda[moneda] ?? [], [porMoneda, moneda]);
  const base = useMemo(() => baseRecurrente(filas, mesActual), [filas, mesActual]);

  const proyectadas = useMemo(
    () => proyectar(filas, { mesActual, saldoInicial: saldoInicial[moneda] ?? 0, incluirCompromisos }),
    [filas, mesActual, saldoInicial, moneda, incluirCompromisos],
  );

  // Ventana visible: los 6 meses cerrados previos + el horizonte elegido.
  const visibles = useMemo(() => {
    const iActual = proyectadas.findIndex((f) => f.mes === mesActual);
    const desde = Math.max(0, iActual - 6);
    return proyectadas.slice(desde, iActual + horizonte + 1);
  }, [proyectadas, mesActual, horizonte]);

  const data = visibles.map((f) => ({ ...f, label: labelMes(f.mes) }));
  const ultima = visibles[visibles.length - 1];
  const saldoHoy = saldoInicial[moneda] ?? 0;
  const delta = ultima ? ultima.saldo - saldoHoy : 0;

  const pillBase = "px-2.5 py-1 rounded-[var(--radius-pill)] text-xs font-medium border transition-colors";
  const pillActive = "bg-navy text-white border-navy";
  const pillInactive = "border-border text-muted-foreground hover:border-foreground/40";

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-muted-foreground hover:text-gold transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Cash flow</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Histórico real y proyección de cuentas líquidas.
          </p>
        </div>
      </div>

      {/* Moneda */}
      <div className="flex gap-1.5">
        {monedas.map((mo) => (
          <button key={mo} type="button" onClick={() => setMoneda(mo)}
            className={cn(pillBase, moneda === mo ? pillActive : pillInactive)}>
            {mo}
          </button>
        ))}
      </div>

      {/* KPI */}
      <div className="mango-card p-[22px]">
        <p className="text-xs text-muted-foreground">
          Saldo proyectado en {horizonte} {horizonte === 1 ? "mes" : "meses"}
        </p>
        <p className={cn(
          "text-3xl font-bold tabular-nums font-mono mt-1",
          (ultima?.saldo ?? 0) >= 0 ? "text-foreground" : "text-danger",
        )}>
          {fmt(ultima?.saldo ?? 0, moneda)}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          Hoy {fmt(saldoHoy, moneda)}
          {" · "}
          <span className={delta >= 0 ? "text-success" : "text-danger"}>
            {delta >= 0 ? "+" : ""}{fmt(delta, moneda)}
          </span>
        </p>
        {base.meses > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Base recurrente ({base.meses} {base.meses === 1 ? "mes" : "meses"}):{" "}
            <span className="text-success tabular-nums font-mono">{fmt(base.ingresos, moneda)}</span>
            {" / "}
            <span className="text-danger tabular-nums font-mono">{fmt(base.egresos, moneda)}</span>
            {" por mes"}
          </p>
        )}
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {HORIZONTES.map((h) => (
            <button key={h} type="button" onClick={() => setHorizonte(h)}
              className={cn(pillBase, horizonte === h ? pillActive : pillInactive)}>
              {h}m
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={incluirCompromisos}
            onChange={(e) => setIncluirCompromisos(e.target.checked)}
          />
          Incluir cuotas y gastos no corrientes ya cargados
        </label>
      </div>

      {/* Gráfico */}
      <div className="h-72 w-full mango-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => fmtShort(v as number, moneda)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={58} />
            <Tooltip
              formatter={(v, name) => [
                fmt(v as number, moneda),
                name === "ingresos" ? "Ingresos" : name === "egresos" ? "Egresos" : "Saldo",
              ]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
                fontSize: 12,
              }}
            />
            <ReferenceLine y={0} stroke="var(--color-border)" />
            <Bar dataKey="ingresos" fill="var(--color-success)" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="egresos" fill="var(--color-danger)" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Line type="monotone" dataKey="saldo" stroke="var(--color-navy)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla mes a mes */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Mes a mes</h2>
        <div className="rounded-[var(--radius-card)] border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Mes</th>
                <th className="text-right px-3 py-2.5 font-medium text-success">Ing. corr.</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Ing. no corr.</th>
                <th className="text-right px-3 py-2.5 font-medium text-danger">Gasto corr.</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">No corr.</th>
                <th className="text-right px-3 py-2.5 font-medium text-gold">Cuotas</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Neto</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => {
                const esActual = f.mes === mesActual;
                return (
                  <tr
                    key={f.mes}
                    className={cn(
                      "border-b border-border last:border-0",
                      esActual && "bg-surface border-t-2 border-t-navy",
                      f.esFuturo && "italic text-muted-foreground",
                    )}
                  >
                    <td className={cn("px-3 py-2.5 whitespace-nowrap", esActual && "font-semibold text-navy not-italic")}>
                      {labelMes(f.mes)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono">{fmt(f.ingresoCorriente, moneda)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono">{f.ingresoNoCorriente ? fmt(f.ingresoNoCorriente, moneda) : "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono">{fmt(f.egresoCorriente, moneda)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-mono">{f.egresoNoCorriente ? fmt(f.egresoNoCorriente, moneda) : "—"}</td>
                    <td className={cn("px-3 py-2.5 text-right tabular-nums font-mono", f.egresoCuotas > 0 && "text-gold")}>
                      {f.egresoCuotas ? fmt(f.egresoCuotas, moneda) : "—"}
                    </td>
                    <td className={cn("px-3 py-2.5 text-right tabular-nums font-mono", f.neto >= 0 ? "text-success" : "text-danger")}>
                      {fmt(f.neto, moneda)}
                    </td>
                    <td className={cn("px-3 py-2.5 text-right tabular-nums font-mono", esActual && "font-semibold not-italic")}>
                      {fmt(f.saldo, moneda)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          En itálica, meses proyectados: se les aplica la base recurrente y se suman las cuotas y
          gastos no corrientes ya cargados. La columna Cuotas es parte de los gastos, no se suma aparte.
        </p>
      </div>
    </div>
  );
}
