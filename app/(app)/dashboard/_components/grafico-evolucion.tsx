"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type { MovGrafico } from "./dashboard-client";

// TODO: reemplazar con cotización dinámica vía dolarapi.com cuando esté disponible
const USD_TO_ARS = 1300;

interface Props {
  movimientos: MovGrafico[];
  cuentas: { id: string; nombre: string }[];
  ajusteInversionIds: string[];
}

function fmt(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: moneda === "consolidado" ? "ARS" : moneda,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function generarMeses(cantidad: number): string[] {
  const resultado: string[] = [];
  const ahora = new Date();
  for (let i = cantidad - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    resultado.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return resultado;
}

function labelMes(mesStr: string) {
  const [año, mes] = mesStr.split("-");
  return new Date(Number(año), Number(mes) - 1, 15)
    .toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
}

// Custom tooltip
function CustomTooltip({ active, payload, label, moneda }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[];
  label?: string; moneda: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {fmt(p.value, moneda === "consolidado" ? "ARS" : moneda)}
        </p>
      ))}
    </div>
  );
}

export function GraficoEvolucion({ movimientos, cuentas, ajusteInversionIds }: Props) {
  const router = useRouter();
  const [periodoMeses, setPeriodoMeses] = useState<3 | 6 | 12 | 24>(6);
  const [cuentaFiltro, setCuentaFiltro] = useState<string>("todas");
  const [moneda, setMoneda] = useState<"ARS" | "USD" | "consolidado">("ARS");

  const chartData = useMemo(() => {
    const meses = generarMeses(periodoMeses);

    return meses.map(mes => {
      const movMes = movimientos.filter(m => {
        if (m.fecha.slice(0, 7) !== mes) return false;
        if (ajusteInversionIds.includes(m.categoria_id ?? "")) return false;
        if (moneda === "ARS" && m.moneda !== "ARS") return false;
        if (moneda === "USD" && m.moneda !== "USD") return false;
        if (cuentaFiltro !== "todas") {
          const enCuenta = m.cuenta_id === cuentaFiltro || m.cuenta_destino_id === cuentaFiltro;
          if (!enCuenta) return false;
        }
        return true;
      });

      const factor = (m: MovGrafico) =>
        m.moneda === "USD" && moneda === "consolidado" ? USD_TO_ARS : 1;

      const ingresos = movMes
        .filter(m => m.tipo === "Ingreso")
        .reduce((acc, m) => acc + m.monto * factor(m), 0);
      const egresos = movMes
        .filter(m => m.tipo === "Egreso")
        .reduce((acc, m) => acc + m.monto * factor(m), 0);

      return { mes, label: labelMes(mes), ingresos, egresos, balance: ingresos - egresos };
    });
  }, [movimientos, periodoMeses, cuentaFiltro, moneda, ajusteInversionIds]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleChartClick(e: any) {
    const mes = e?.activePayload?.[0]?.payload?.mes;
    if (mes) router.push(`/movimientos?mes=${mes}`);
  }

  const pillBase = "px-3 py-1 rounded-md text-xs font-medium border transition-colors";
  const pillActive = "border-primary bg-primary/10 text-primary";
  const pillInactive = "border-border text-muted-foreground hover:text-foreground hover:bg-surface";

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        {/* Período */}
        <div className="flex items-center gap-1">
          {([3, 6, 12, 24] as const).map(p => (
            <button key={p} onClick={() => setPeriodoMeses(p)}
              className={cn(pillBase, periodoMeses === p ? pillActive : pillInactive)}>
              {p}m
            </button>
          ))}
        </div>

        {/* Moneda */}
        <div className="flex items-center gap-1">
          {(["ARS", "USD", "consolidado"] as const).map(m => (
            <button key={m} onClick={() => setMoneda(m)}
              className={cn(pillBase, moneda === m ? pillActive : pillInactive)}>
              {m === "consolidado" ? "Consol." : m}
            </button>
          ))}
        </div>

        {/* Cuenta */}
        {cuentas.length > 1 && (
          <select
            value={cuentaFiltro}
            onChange={e => setCuentaFiltro(e.target.value)}
            className="text-xs border border-border rounded-md px-2 py-1 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="todas">Todas las cuentas</option>
            {cuentas.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={chartData}
          onClick={handleChartClick}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={fmtShort}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false} tickLine={false}
            width={52}
          />
          <Tooltip
            content={<CustomTooltip moneda={moneda} />}
            cursor={{ fill: "#1e293b", opacity: 0.8 }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            formatter={(value) => <span style={{ color: "#64748b" }}>{value}</span>}
          />
          <Bar
            dataKey="ingresos" name="Ingresos" fill="#22c55e" opacity={0.85}
            radius={[3, 3, 0, 0]} style={{ cursor: "pointer" }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(data: any) => data?.mes && router.push(`/movimientos?mes=${data.mes}`)}
          />
          <Bar
            dataKey="egresos" name="Egresos" fill="#ef4444" opacity={0.85}
            radius={[3, 3, 0, 0]} style={{ cursor: "pointer" }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(data: any) => data?.mes && router.push(`/movimientos?mes=${data.mes}`)}
          />
          <Line
            type="monotone" dataKey="balance" name="Balance"
            stroke="#818cf8" strokeWidth={2}
            dot={{ r: 3, fill: "#818cf8", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Nota conversión USD */}
      {moneda === "consolidado" && (
        <p className="text-xs text-muted-foreground text-center">
          Convertido a USD blue ~$1.300 (estimado) · Los montos son aproximados
        </p>
      )}

      {/* Hint click */}
      <p className="text-xs text-muted-foreground text-center">
        Hacé clic en un mes para ver sus movimientos
      </p>
    </div>
  );
}
