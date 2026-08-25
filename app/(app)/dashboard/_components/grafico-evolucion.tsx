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
    <div className="mango-card px-3 py-2 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: COLOR_SERIE[p.name] ?? p.color }} className="tabular-nums">
          {p.name}: {fmt(p.value, moneda === "consolidado" ? "ARS" : moneda)}
        </p>
      ))}
    </div>
  );
}

/**
 * Color solido de cada serie. Las barras se pintan con un degrade
 * (`url(#...)`), que NO es un color CSS valido: la leyenda y el tooltip
 * necesitan el color plano equivalente.
 */
const COLOR_SERIE: Record<string, string> = {
  Ingresos: "var(--color-success)",
  Egresos: "var(--color-gold)",
  Balance: "var(--color-navy)",
};

/**
 * Leyenda propia. Recharts pinta el swatch con el `fill` de la serie, que acá
 * es un degrade (`url(#...)`) y no un color CSS: el swatch quedaria en negro.
 */
function LeyendaMarca() {
  return (
    <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
      {Object.entries(COLOR_SERIE).map(([nombre, color]) => (
        <span key={nombre} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: color }}
          />
          {nombre}
        </span>
      ))}
    </div>
  );
}

/**
 * Geometria de las barras, tomada del diseno: barras finas con las esquinas
 * redondeadas arriba Y abajo (en el diseno son divs con border-radius:7px
 * uniforme apoyados sobre la linea de base).
 */
const RADIO_BARRA: [number, number, number, number] = [6, 6, 6, 6];
const ANCHO_BARRA = 14;

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
          {/* Degradés de marca: el diseno pinta las barras con un gradiente
              vertical claro->oscuro, no con un color plano. */}
          <defs>
            <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-leaf-light)" />
              <stop offset="100%" stopColor="var(--color-success)" />
            </linearGradient>
            <linearGradient id="gradEgresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-gold-light)" />
              <stop offset="100%" stopColor="var(--color-gold)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={fmtShort}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false} tickLine={false}
            width={52}
          />
          <Tooltip
            content={<CustomTooltip moneda={moneda} />}
            cursor={{ fill: "var(--color-surface-2)", opacity: 0.6 }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            content={<LeyendaMarca />}
          />
          <Bar
            dataKey="ingresos" name="Ingresos" fill="url(#gradIngresos)"
            radius={RADIO_BARRA} maxBarSize={ANCHO_BARRA} style={{ cursor: "pointer" }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(data: any) => data?.mes && router.push(`/movimientos?mes=${data.mes}`)}
          />
          <Bar
            dataKey="egresos" name="Egresos" fill="url(#gradEgresos)"
            radius={RADIO_BARRA} maxBarSize={ANCHO_BARRA} style={{ cursor: "pointer" }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(data: any) => data?.mes && router.push(`/movimientos?mes=${data.mes}`)}
          />
          <Line
            type="monotone" dataKey="balance" name="Balance"
            stroke="var(--color-navy)" strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-navy)", strokeWidth: 0 }}
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
