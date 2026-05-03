"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Clock, Users, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { cn } from "@/lib/utils";
import { saldarTodoPersona } from "@/lib/supabase/actions/gastos-compartidos";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface GastoDetalleRow {
  gastoId:        string;
  concepto:       string | null;
  fecha:          string;
  moneda:         string;
  participanteId: string;
  estado:         "pendiente" | "cobrado";
  monto:          number;
}

export interface PersonaBalanceRow {
  personaId:    string;
  nombre:       string;
  pendienteARS: number;
  pendienteUSD: number;
  cobradoARS:   number;
  cobradoUSD:   number;
  gastosDetalle: GastoDetalleRow[];
}

interface SaldarModal {
  personaId: string;
  nombre:    string;
  moneda:    string;
  monto:     number;
}

interface Props {
  balances:      PersonaBalanceRow[];
  cuentas:       { id: string; nombre: string }[];
  nombreUsuario: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatFecha(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BalancesClient({ balances, cuentas, nombreUsuario: _nombreUsuario }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [saldarModal, setSaldarModal] = useState<SaldarModal | null>(null);
  const [saldarFecha, setSaldarFecha] = useState(todayStr());
  const [saldarCuentaId, setSaldarCuentaId] = useState<string | null>(null);
  const [saldarObservacion, setSaldarObservacion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const totalTeDebenARS = balances.reduce((acc, p) => acc + p.pendienteARS, 0);
  const totalTeDebenUSD = balances.reduce((acc, p) => acc + p.pendienteUSD, 0);
  const hayPendientes = totalTeDebenARS > 0 || totalTeDebenUSD > 0;
  const todasSaldadas = !hayPendientes && balances.length > 0;

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openSaldar(persona: PersonaBalanceRow, moneda: string, monto: number) {
    setSaldarModal({ personaId: persona.personaId, nombre: persona.nombre, moneda, monto });
    setSaldarFecha(todayStr());
    setSaldarCuentaId(null);
    setSaldarObservacion("");
    setModalError(null);
  }

  async function handleConfirmarSaldar() {
    if (!saldarModal) return;
    setSubmitting(true);
    setModalError(null);
    try {
      await saldarTodoPersona({
        personaId:      saldarModal.personaId,
        moneda:         saldarModal.moneda,
        cuentaDestinoId: saldarCuentaId,
        fecha:          saldarFecha,
        observacion:    saldarObservacion.trim() || null,
      });
      setSaldarModal(null);
      startTransition(() => router.refresh());
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Error al saldar");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────────

  if (balances.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold">Balances</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gastos compartidos pendientes</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Users className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium">Sin gastos compartidos</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cuando registres un gasto compartido, el balance aparecerá acá.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/movimientos")}
            className="gap-1.5"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Ir a movimientos
          </Button>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Modal saldar ─────────────────────────────────────────────────── */}
      {saldarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !submitting && setSaldarModal(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">
                Saldar todo con {saldarModal.nombre}
              </h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSaldarModal(null)}
                disabled={submitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Se creará un ingreso de{" "}
              <span className="font-semibold text-green-400">
                {fmt(saldarModal.monto, saldarModal.moneda)}
              </span>{" "}
              y todos los cobros pendientes de {saldarModal.nombre} quedarán marcados como cobrados.
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Fecha de cobro</Label>
                <Input
                  type="date"
                  value={saldarFecha}
                  onChange={(e) => setSaldarFecha(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cuenta destino</Label>
                <NamedSelect
                  options={cuentas.map((c) => ({ value: c.id, label: c.nombre }))}
                  value={saldarCuentaId ?? ""}
                  onValueChange={(v) => setSaldarCuentaId(v || null)}
                  placeholder="Opcional…"
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Observación (opcional)</Label>
                <Input
                  value={saldarObservacion}
                  onChange={(e) => setSaldarObservacion(e.target.value)}
                  placeholder="Ej. Transferencia recibida"
                />
              </div>
            </div>

            {modalError && (
              <p className="text-xs text-destructive">{modalError}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="ghost"
                onClick={() => setSaldarModal(null)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarSaldar}
                disabled={submitting || !saldarFecha}
              >
                {submitting ? "Procesando…" : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold">Balances</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cobros pendientes de gastos compartidos
          </p>
        </div>

        {/* KPIs */}
        <div className="flex flex-wrap gap-3">
          {totalTeDebenARS > 0 && (
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Te deben ARS</p>
              <p className="text-xl font-bold text-green-400 mt-0.5 tabular-nums">
                {fmt(totalTeDebenARS)}
              </p>
            </div>
          )}
          {totalTeDebenUSD > 0 && (
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Te deben USD</p>
              <p className="text-xl font-bold text-green-400 mt-0.5 tabular-nums">
                {fmt(totalTeDebenUSD, "USD")}
              </p>
            </div>
          )}
          {todasSaldadas && (
            <div className="rounded-lg border border-emerald-800/40 bg-emerald-900/10 px-4 py-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-400">Todo saldado</p>
            </div>
          )}
        </div>

        {/* All-saldado state */}
        {todasSaldadas && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <Check className="h-8 w-8 text-emerald-400" />
            <p className="text-sm font-medium text-emerald-400">Todo saldado ✓</p>
            <p className="text-xs text-muted-foreground">
              No hay cobros pendientes. Historial disponible abajo.
            </p>
          </div>
        )}

        {/* Lista de personas */}
        <div className="flex flex-col gap-2">
          {balances.map((persona) => {
            const isExpanded = expandedIds.has(persona.personaId);
            const hasPendARS  = persona.pendienteARS > 0;
            const hasPendUSD  = persona.pendienteUSD > 0;
            const hasPend     = hasPendARS || hasPendUSD;
            const cantGastos  = new Set(persona.gastosDetalle.map((g) => g.gastoId)).size;
            const cantPend    = persona.gastosDetalle.filter((g) => g.estado === "pendiente").length;

            return (
              <div
                key={persona.personaId}
                className="border border-border rounded-lg bg-card overflow-hidden"
              >
                {/* Row principal */}
                <div className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{persona.nombre}</span>
                        {hasPendARS && (
                          <span className="text-sm font-bold text-green-400 tabular-nums">
                            +{fmt(persona.pendienteARS)}
                          </span>
                        )}
                        {hasPendUSD && (
                          <span className="text-sm font-bold text-green-400 tabular-nums">
                            +{fmt(persona.pendienteUSD, "USD")}
                          </span>
                        )}
                        {!hasPend && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Saldado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cantGastos} gasto{cantGastos !== 1 ? "s" : ""}
                        {cantPend > 0 && ` · ${cantPend} pendiente${cantPend !== 1 ? "s" : ""}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      {hasPendARS && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => openSaldar(persona, "ARS", persona.pendienteARS)}
                        >
                          Saldar{hasPendUSD ? " ARS" : ` ${fmt(persona.pendienteARS)}`}
                        </Button>
                      )}
                      {hasPendUSD && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => openSaldar(persona, "USD", persona.pendienteUSD)}
                        >
                          Saldar{hasPendARS ? " USD" : ` ${fmt(persona.pendienteUSD, "USD")}`}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleExpand(persona.personaId)}
                        title={isExpanded ? "Ocultar detalle" : "Ver detalle"}
                      >
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Detalle expandible */}
                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-3 pt-2 border-t border-border/50 bg-surface/30 space-y-1.5">
                    {persona.gastosDetalle
                      .slice()
                      .sort((a, b) => b.fecha.localeCompare(a.fecha))
                      .map((g) => (
                        <div key={g.participanteId} className="flex items-center gap-2 text-xs">
                          {g.estado === "cobrado" ? (
                            <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                          ) : (
                            <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                          )}
                          <span className="flex-1 truncate text-muted-foreground">
                            {g.concepto || "Sin concepto"}
                            <span className="ml-1 text-muted-foreground/60">
                              · {formatFecha(g.fecha)}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "tabular-nums font-medium shrink-0",
                              g.estado === "cobrado"
                                ? "text-muted-foreground/60 line-through"
                                : "text-foreground"
                            )}
                          >
                            {fmt(g.monto, g.moneda)}
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
    </>
  );
}
