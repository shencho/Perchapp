"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ResumenCategorias } from "@/lib/domain/categorias";

type Corte = "categoria" | "metodo" | "cuenta" | "necesidad";

type Cortes = Record<Corte, ResumenCategorias>;

const CORTES: { value: Corte; label: string }[] = [
  { value: "categoria", label: "Categoría" },
  { value: "metodo", label: "Medio de pago" },
  { value: "cuenta", label: "Cuenta" },
  { value: "necesidad", label: "Necesidad" },
];

interface Props {
  anioMes: string;
  monedas: string[];
  porMoneda: Record<string, { ingresos: Cortes; egresos: Cortes }>;
}

// Paleta de categorías (tokens de marca MANGO + acentos).
const COLORES = [
  "#1e3a5f", "#c98a2b", "#10b981", "#3b82f6", "#ef4444",
  "#f59e0b", "#8b5cf6", "#14b8a6", "#ec4899", "#6b7280",
];

function fmt(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: moneda,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function labelMes(anioMes: string) {
  const d = new Date(`${anioMes}-01T12:00:00`);
  // Formato "mmm aaaa" (ej. "ago 2026").
  return d.toLocaleDateString("es-AR", { month: "short", year: "numeric" }).replace(".", "");
}

export function EstadisticasClient({ anioMes, monedas, porMoneda }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("egresos");
  const [moneda, setMoneda] = useState(monedas[0] ?? "ARS");
  const [corte, setCorte] = useState<Corte>("categoria");

  const vacio: Cortes = { categoria: { total: 0, filas: [] }, metodo: { total: 0, filas: [] }, cuenta: { total: 0, filas: [] }, necesidad: { total: 0, filas: [] } };
  const resumen = porMoneda[moneda] ?? { ingresos: vacio, egresos: vacio };

  function stepMes(delta: number) {
    const base = new Date(`${anioMes}-01T12:00:00`);
    const d = new Date(base.getFullYear(), base.getMonth() + delta, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const url = new URL(window.location.href);
    url.searchParams.set("mes", value);
    router.push(url.toString());
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Estadísticas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ingresos y gastos del mes. Cambiá el corte para ver la misma plata agrupada distinto.
        </p>
      </div>

      {/* Barra de mes con flechas */}
      <div className="flex items-center justify-between gap-2 mango-card px-2 py-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => stepMes(-1)} title="Mes anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold capitalize">{labelMes(anioMes)}</span>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => stepMes(1)} title="Mes siguiente">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Corte: la misma plata agrupada de distintas maneras */}
      <div className="flex gap-1.5 flex-wrap">
        {CORTES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCorte(c.value)}
            className={cn(
              "px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium border transition-colors",
              corte === c.value
                ? "bg-navy text-white border-navy"
                : "border-border text-muted-foreground hover:border-foreground/40",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Moneda: las escalas no se mezclan, se mira una por vez */}
      <div className="flex gap-1.5">
        {monedas.map((mo) => (
          <button
            key={mo}
            type="button"
            onClick={() => setMoneda(mo)}
            className={cn(
              "px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium border transition-colors",
              moneda === mo
                ? "bg-navy text-white border-navy"
                : "border-border text-muted-foreground hover:border-foreground/40",
            )}
          >
            {mo}
          </button>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList className="w-full group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="ingresos" className="flex-1 flex-col gap-0.5 py-2">
            <span className="text-sm">Ingresos</span>
            <span className="text-xs tabular-nums font-mono text-success">{fmt(resumen.ingresos[corte].total, moneda)}</span>
          </TabsTrigger>
          <TabsTrigger value="egresos" className="flex-1 flex-col gap-0.5 py-2">
            <span className="text-sm">Gastos</span>
            <span className="text-xs tabular-nums font-mono text-danger">{fmt(resumen.egresos[corte].total, moneda)}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingresos" className="mt-4">
          <SeccionCategorias resumen={resumen.ingresos[corte]} moneda={moneda} vacio="No hay ingresos en este mes." />
        </TabsContent>
        <TabsContent value="egresos" className="mt-4">
          <SeccionCategorias resumen={resumen.egresos[corte]} moneda={moneda} vacio="No hay gastos en este mes." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SeccionCategorias({
  resumen, moneda, vacio,
}: {
  resumen: ResumenCategorias;
  moneda: string;
  vacio: string;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);

  if (resumen.filas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center border border-dashed border-border rounded-lg">
        {vacio}
      </p>
    );
  }

  const data = resumen.filas.map((c, i) => ({ ...c, fill: COLORES[i % COLORES.length] }));

  return (
    <div className="flex flex-col gap-6">
      {/* Torta */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="monto"
              nameKey="nombre"
              cx="50%" cy="50%"
              outerRadius="80%" innerRadius="45%"
              strokeWidth={2}
              stroke="var(--color-card)"
            >
              {data.map((c) => <Cell key={c.id} fill={c.fill} />)}
            </Pie>
            <Tooltip
              formatter={(v, name) => [fmt(v as number, moneda), name as string]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Detalle por categoría, desplegable a subcategorías */}
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border overflow-hidden">
        {data.map((c) => {
          const tieneHijos = c.hijos.length > 0;
          const abiertaEsta = abierta === c.id;
          return (
            <div key={c.id}>
              <button
                type="button"
                disabled={!tieneHijos}
                onClick={() => setAbierta(abiertaEsta ? null : c.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  tieneHijos && "hover:bg-surface active:bg-surface-2",
                  abiertaEsta && "bg-surface",
                )}
              >
                {tieneHijos ? (
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
                      !abiertaEsta && "-rotate-90",
                    )}
                  />
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.fill }} />
                <span className="text-sm font-medium min-w-0 truncate flex-1">{c.nombre}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">{c.porcentaje}%</span>
                <span className="text-sm font-semibold tabular-nums font-mono shrink-0 w-28 text-right">
                  {fmt(c.monto, moneda)}
                </span>
              </button>

              {abiertaEsta && (
                <div className="bg-surface pb-1">
                  {c.hijos.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 pl-11 pr-4 py-1.5">
                      <span className="text-xs text-muted-foreground min-w-0 truncate flex-1">{h.nombre}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{h.porcentaje}%</span>
                      <span className="text-xs tabular-nums font-mono shrink-0 w-28 text-right">
                        {fmt(h.monto, moneda)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
