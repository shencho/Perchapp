"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface CategoriaResumen {
  id: string;
  nombre: string;
  monto: number;
  porcentaje: number;
}

interface Resumen {
  total: number;
  categorias: CategoriaResumen[];
}

interface Props {
  anioMes: string;
  ingresos: Resumen;
  egresos: Resumen;
}

// Paleta de categorías (tokens de marca MANGO + acentos).
const COLORES = [
  "#1e3a5f", "#c98a2b", "#10b981", "#3b82f6", "#ef4444",
  "#f59e0b", "#8b5cf6", "#14b8a6", "#ec4899", "#6b7280",
];

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function labelMes(anioMes: string) {
  const d = new Date(`${anioMes}-01T12:00:00`);
  // Formato "mmm aaaa" (ej. "ago 2026").
  return d.toLocaleDateString("es-AR", { month: "short", year: "numeric" }).replace(".", "");
}

export function EstadisticasClient({ anioMes, ingresos, egresos }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("egresos");

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
        <p className="text-sm text-muted-foreground mt-1">Ingresos y gastos por categoría (ARS).</p>
      </div>

      {/* Barra de mes con flechas */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2 py-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => stepMes(-1)} title="Mes anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold capitalize">{labelMes(anioMes)}</span>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => stepMes(1)} title="Mes siguiente">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList className="w-full group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="ingresos" className="flex-1 flex-col gap-0.5 py-2">
            <span className="text-sm">Ingresos</span>
            <span className="text-xs tabular-nums font-mono text-success">{fmt(ingresos.total)}</span>
          </TabsTrigger>
          <TabsTrigger value="egresos" className="flex-1 flex-col gap-0.5 py-2">
            <span className="text-sm">Gastos</span>
            <span className="text-xs tabular-nums font-mono text-danger">{fmt(egresos.total)}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingresos" className="mt-4">
          <SeccionCategorias resumen={ingresos} vacio="No hay ingresos en este mes." />
        </TabsContent>
        <TabsContent value="egresos" className="mt-4">
          <SeccionCategorias resumen={egresos} vacio="No hay gastos en este mes." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SeccionCategorias({ resumen, vacio }: { resumen: Resumen; vacio: string }) {
  if (resumen.categorias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center border border-dashed border-border rounded-lg">
        {vacio}
      </p>
    );
  }

  const data = resumen.categorias.map((c, i) => ({ ...c, fill: COLORES[i % COLORES.length] }));

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
              formatter={(v, name) => [fmt(v as number), name as string]}
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

      {/* Detalle por categoría */}
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {data.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.fill }} />
            <span className="text-sm font-medium min-w-0 truncate flex-1">{c.nombre}</span>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">{c.porcentaje}%</span>
            <span className={cn("text-sm font-semibold tabular-nums font-mono shrink-0 w-28 text-right")}>
              {fmt(c.monto)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
