"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calcularSaldoPrestamo } from "@/lib/domain/calcularSaldoPrestamo";
import { PrestamoEditor } from "./prestamo-editor";
import type { Persona } from "@/types/supabase";
import type { PrestamoConPagos } from "@/lib/supabase/actions/prestamos";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function nombrePrestamo(p: PrestamoConPagos): string {
  if (p.tipo === "bancario") return p.institucion_nombre ?? "Institución";
  const persona = p.personas?.nombre ?? "Persona";
  return p.tipo === "otorgado" ? `Préstamo a ${persona}` : `Préstamo de ${persona}`;
}

function formatMonto(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const TIPO_CONFIG = {
  otorgado: { label: "Otorgado", icon: TrendingUp,  color: "bg-green-900/40 text-green-300 border-green-800/60" },
  recibido: { label: "Recibido", icon: TrendingDown, color: "bg-orange-900/40 text-orange-300 border-orange-800/60" },
  bancario: { label: "Bancario", icon: Building2,    color: "bg-blue-900/40 text-blue-300 border-blue-800/60" },
} as const;

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  prestamos: PrestamoConPagos[];
  personas: Persona[];
}

type FiltroEstado = "todos" | "activo" | "cancelado";
type FiltroTipo   = "todos" | "otorgado" | "recibido" | "bancario";

export function PrestamosClient({ prestamos, personas }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("activo");
  const [filtroTipo, setFiltroTipo]     = useState<FiltroTipo>("todos");
  const [editorOpen, setEditorOpen]     = useState(false);

  const filtrados = prestamos.filter((p) => {
    if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
    if (filtroTipo   !== "todos" && p.tipo   !== filtroTipo)   return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Préstamos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{prestamos.length} en total</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setEditorOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {/* Estado */}
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(["activo", "todos", "cancelado"] as FiltroEstado[]).map((v) => (
            <button
              key={v}
              onClick={() => setFiltroEstado(v)}
              className={cn(
                "px-3 py-1.5 transition-colors capitalize",
                filtroEstado === v
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-surface"
              )}
            >
              {v === "activo" ? "Activos" : v === "cancelado" ? "Cancelados" : "Todos"}
            </button>
          ))}
        </div>

        {/* Tipo */}
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(["todos", "otorgado", "recibido", "bancario"] as FiltroTipo[]).map((v) => (
            <button
              key={v}
              onClick={() => setFiltroTipo(v)}
              className={cn(
                "px-3 py-1.5 transition-colors capitalize",
                filtroTipo === v
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-surface"
              )}
            >
              {v === "todos" ? "Todos" : TIPO_CONFIG[v].label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">
            {prestamos.length === 0
              ? "No hay préstamos registrados."
              : "No hay préstamos con los filtros seleccionados."}
          </p>
          {prestamos.length === 0 && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditorOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Agregar el primero
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => {
            const pagos = p.prestamos_pagos ?? [];
            const { totalPagado, saldoPendiente, porcentajeCancelado } = calcularSaldoPrestamo(p.monto_inicial, pagos);
            const config = TIPO_CONFIG[p.tipo];
            const Icon = config.icon;

            return (
              <button
                key={p.id}
                onClick={() => startTransition(() => router.push(`/prestamos/${p.id}`))}
                className="text-left border border-border rounded-lg bg-card p-4 hover:bg-surface/50 transition-colors flex flex-col gap-3"
              >
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{nombrePrestamo(p)}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn("inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border", config.color)}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </span>
                      {p.estado === "cancelado" && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface text-muted-foreground border border-border">
                          Cancelado
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>

                {/* Montos */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Monto inicial</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {formatMonto(p.monto_inicial, p.moneda)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Saldo pendiente</span>
                    <span className={cn("tabular-nums font-semibold", saldoPendiente > 0 ? "text-amber-400" : "text-emerald-400")}>
                      {formatMonto(saldoPendiente, p.moneda)}
                    </span>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border/40">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${porcentajeCancelado}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatMonto(totalPagado, p.moneda)} pagado</span>
                    <span>{porcentajeCancelado}%</span>
                  </div>
                </div>

                {/* Info bancario */}
                {p.tipo === "bancario" && p.cuota_mensual && (
                  <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
                    Cuota: {formatMonto(p.cuota_mensual, p.moneda)}
                    {p.cantidad_cuotas && (
                      <span> · {pagos.length}/{p.cantidad_cuotas} cuotas</span>
                    )}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      <PrestamoEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          startTransition(() => router.refresh());
        }}
        personas={personas}
      />
    </div>
  );
}
