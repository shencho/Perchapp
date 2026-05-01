"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Copy, Trash2, Search, ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NamedSelect } from "@/components/ui/named-select";
import { deleteMovimiento, duplicateMovimiento } from "@/lib/supabase/actions/movimientos";
import { deletePagoFromMovimiento } from "@/lib/supabase/actions/pagos";
import {
  getParticipantes,
  marcarCobrado,
  marcarPendiente,
} from "@/lib/supabase/actions/gastos-compartidos";
import { TIPOS_MOV, METODOS, AMBITOS } from "@/lib/supabase/actions/movimientos-types";
import { MovimientoEditor } from "./movimiento-editor";
import type { Movimiento, Cuenta, Tarjeta, Categoria, Persona, GastoCompartidoParticipante } from "@/types/supabase";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type MovimientoConRelaciones = Movimiento & {
  categorias?: { id: string; nombre: string; tipo: string; parent_id: string | null } | null;
  cuentas?: { id: string; nombre: string; tipo: string } | null;
  cuenta_destino?: { id: string; nombre: string } | null;
  tarjetas?: { id: string; nombre: string } | null;
  clientes?: { id: string; nombre: string } | null;
  servicios_cliente?: { id: string; nombre: string } | null;
  gastos_compartidos_participantes?: { id: string; estado: string; monto: number }[] | null;
};

interface Props {
  movimientos: MovimientoConRelaciones[];
  total: number;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  clientes: { id: string; nombre: string }[];
  personas: Persona[];
  grupos: GrupoConMiembros[];
  mesActual: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const NECESIDAD_COLORS: Record<number, string> = {
  1: "bg-red-900/50 text-red-300 border-red-800",
  2: "bg-orange-900/50 text-orange-300 border-orange-800",
  3: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
  4: "bg-green-900/50 text-green-300 border-green-800",
  5: "bg-emerald-900/50 text-emerald-300 border-emerald-800",
};

function formatMonto(n: number, moneda = "ARS") {
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
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── CompartidoPanel ───────────────────────────────────────────────────────────

function CompartidoPanel({
  movimientoId,
  concepto,
  moneda,
  cuentas,
}: {
  movimientoId: string;
  concepto: string | null;
  moneda: string;
  cuentas: Cuenta[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [participantes, setParticipantes] = useState<GastoCompartidoParticipante[] | null>(null);
  const [cobradoFormId, setCobradoFormId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(todayStr());
  const [cuentaDestinoId, setCuentaDestinoId] = useState<string | null>(null);
  const [observacion, setObservacion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getParticipantes(movimientoId)
      .then(setParticipantes)
      .catch(() => setParticipantes([]));
  }, [movimientoId]);

  async function reload() {
    const updated = await getParticipantes(movimientoId);
    setParticipantes(updated);
    startTransition(() => router.refresh());
  }

  async function handleMarcarCobrado(p: GastoCompartidoParticipante) {
    setSubmitting(true);
    try {
      await marcarCobrado({
        participanteId: p.id,
        fecha,
        cuentaDestinoId,
        observacion: observacion.trim() || null,
        conceptoGasto: concepto || "gasto compartido",
        montoGasto: p.monto,
        moneda,
      });
      setCobradoFormId(null);
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarcarPendiente(p: GastoCompartidoParticipante) {
    if (!confirm(`¿Desmarcar el cobro de ${p.persona_nombre}? Se eliminará el movimiento de reembolso.`)) return;
    try {
      await marcarPendiente(p.id);
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  }

  if (!participantes) {
    return <p className="text-xs text-muted-foreground py-2">Cargando…</p>;
  }
  if (participantes.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Sin participantes registrados.</p>;
  }

  return (
    <div className="space-y-2 py-1">
      {participantes.map((p) => (
        <div key={p.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm">{p.persona_nombre}</span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatMonto(p.monto, moneda)}
            </span>
            {p.estado === "cobrado" ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/40">
                  Cobrado
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => handleMarcarPendiente(p)}
                >
                  Desmarcar
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => {
                  setCobradoFormId(cobradoFormId === p.id ? null : p.id);
                  setFecha(todayStr());
                  setCuentaDestinoId(null);
                  setObservacion("");
                }}
              >
                Marcar cobrado
              </Button>
            )}
          </div>

          {cobradoFormId === p.id && (
            <div className="ml-4 p-3 rounded-md border border-border bg-surface/60 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Fecha de cobro</label>
                  <Input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Cuenta destino</label>
                  <NamedSelect
                    options={cuentas.map((c) => ({ value: c.id, label: c.nombre }))}
                    value={cuentaDestinoId ?? ""}
                    onValueChange={(v) => setCuentaDestinoId(v || null)}
                    placeholder="Opcional…"
                    className="h-7 text-xs w-full"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Observación (opcional)</label>
                <Input
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Ej. Transferido el lunes"
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCobradoFormId(null)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={submitting || !fecha}
                  onClick={() => handleMarcarCobrado(p)}
                >
                  {submitting ? "Guardando…" : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Genera lista de los últimos 12 meses para el filtro
function getMeses() {
  const meses: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    meses.push({ value, label });
  }
  return meses;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MovimientosClient({ movimientos, total, cuentas, tarjetas, categorias, clientes, personas, grupos, mesActual }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Movimiento | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtros locales (UI)
  const [busqueda, setBusqueda] = useState("");
  const [filtroMes, setFiltroMes] = useState(mesActual);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroAmbito, setFiltroAmbito] = useState<string>("todos");
  const [filtroMetodo, setFiltroMetodo] = useState<string>("todos");
  const [filtroCuenta, setFiltroCuenta] = useState<string>("todas");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");

  const meses = getMeses();
  const catsPadre = categorias.filter((c) => !c.parent_id);

  // Filtro local (cliente)
  const filtrados = movimientos.filter((m) => {
    if (busqueda) {
      const b = busqueda.toLowerCase();
      if (!(m.concepto?.toLowerCase().includes(b) || m.descripcion?.toLowerCase().includes(b))) return false;
    }
    if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;
    if (filtroAmbito !== "todos" && m.ambito !== filtroAmbito) return false;
    if (filtroMetodo !== "todos" && m.metodo !== filtroMetodo) return false;
    if (filtroCuenta !== "todas" && m.cuenta_id !== filtroCuenta) return false;
    if (filtroCategoria !== "todas" && m.categoria_id !== filtroCategoria) return false;
    return true;
  });

  function handleNuevo() {
    setEditing(null);
    setEditorOpen(true);
  }

  function handleEditar(m: Movimiento) {
    setEditing(m);
    setEditorOpen(true);
  }

  async function handleDuplicar(id: string) {
    await duplicateMovimiento(id);
    startTransition(() => router.refresh());
  }

  async function handleEliminar(m: MovimientoConRelaciones) {
    const isProfesionalIngreso = m.tipo === "Ingreso" && m.ambito === "Profesional";
    const msg = isProfesionalIngreso
      ? "¿Eliminar este movimiento? Si tiene un pago vinculado, también se eliminará junto a las asignaciones de registros."
      : "¿Eliminar este movimiento?";
    if (!confirm(msg)) return;
    if (isProfesionalIngreso) {
      await deletePagoFromMovimiento(m.id);
    } else {
      await deleteMovimiento(m.id);
    }
    startTransition(() => router.refresh());
  }

  function handleMesChange(mes: string | null) {
    if (!mes) return;
    setFiltroMes(mes);
    // Recargar página con nuevo mes (server-side)
    const url = new URL(window.location.href);
    url.searchParams.set("mes", mes);
    router.push(url.toString());
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Movimientos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{total} registros</p>
        </div>
        <Button onClick={handleNuevo} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8 h-8 w-44 text-sm"
          />
        </div>

        {/* Mes */}
        <NamedSelect
          options={meses}
          value={filtroMes}
          onValueChange={(v) => v && handleMesChange(v)}
          className="h-8 text-sm w-40"
        />

        {/* Tipo — muestra "Tipo" (muted) cuando no hay filtro */}
        <NamedSelect
          options={[{ value: "todos", label: "Todos los tipos" }, ...TIPOS_MOV.map(t => ({ value: t, label: t }))]}
          value={filtroTipo !== "todos" ? filtroTipo : ""}
          onValueChange={(v) => setFiltroTipo(v ?? "todos")}
          placeholder="Tipo"
          className={cn("h-8 text-sm w-36", filtroTipo !== "todos" && "ring-1 ring-primary/50 border-primary/50")}
        />

        {/* Ámbito */}
        <NamedSelect
          options={[{ value: "todos", label: "Todos" }, ...AMBITOS.map(a => ({ value: a, label: a }))]}
          value={filtroAmbito !== "todos" ? filtroAmbito : ""}
          onValueChange={(v) => setFiltroAmbito(v ?? "todos")}
          placeholder="Ámbito"
          className={cn("h-8 text-sm w-32", filtroAmbito !== "todos" && "ring-1 ring-primary/50 border-primary/50")}
        />

        {/* Método */}
        <NamedSelect
          options={[{ value: "todos", label: "Todos los métodos" }, ...METODOS.map(m => ({ value: m, label: m }))]}
          value={filtroMetodo !== "todos" ? filtroMetodo : ""}
          onValueChange={(v) => setFiltroMetodo(v ?? "todos")}
          placeholder="Método"
          className={cn("h-8 text-sm w-40", filtroMetodo !== "todos" && "ring-1 ring-primary/50 border-primary/50")}
        />

        {/* Cuenta — usa UUIDs como valores */}
        <NamedSelect
          options={[{ value: "todas", label: "Todas las cuentas" }, ...cuentas.map(c => ({ value: c.id, label: c.nombre }))]}
          value={filtroCuenta !== "todas" ? filtroCuenta : ""}
          onValueChange={(v) => setFiltroCuenta(v ?? "todas")}
          placeholder="Cuenta"
          className={cn("h-8 text-sm w-36", filtroCuenta !== "todas" && "ring-1 ring-primary/50 border-primary/50")}
        />

        {/* Categoría — usa UUIDs como valores */}
        <NamedSelect
          options={[{ value: "todas", label: "Todas las categorías" }, ...catsPadre.map(c => ({ value: c.id, label: c.nombre }))]}
          value={filtroCategoria !== "todas" ? filtroCategoria : ""}
          onValueChange={(v) => setFiltroCategoria(v ?? "todas")}
          placeholder="Categoría"
          className={cn("h-8 text-sm w-40", filtroCategoria !== "todas" && "ring-1 ring-primary/50 border-primary/50")}
        />
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No hay movimientos para este período.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={handleNuevo}>
            <Plus className="h-4 w-4 mr-1" /> Agregar el primero
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden md:block rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ámbito</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concepto</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Método</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">N</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m) => {
                  const partsTotal = m.gastos_compartidos_participantes?.length ?? 0;
                  const partsCobrados = m.gastos_compartidos_participantes?.filter((p) => p.estado === "cobrado").length ?? 0;
                  const isExpanded = expandedId === m.id;
                  return (
                    <>
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatFecha(m.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full border",
                          m.ambito === "Profesional"
                            ? "bg-blue-900/40 text-blue-300 border-blue-800"
                            : "bg-surface text-muted-foreground border-border"
                        )}>
                          {m.ambito}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-[200px]">
                          {m.concepto || m.descripcion || "—"}
                        </div>
                        {m.categorias && (
                          <div className="text-xs text-muted-foreground">{m.categorias.nombre}</div>
                        )}
                        {m.ambito === "Profesional" && m.clientes && (
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-xs text-blue-300 bg-blue-900/20 border border-blue-800/40 px-1.5 py-0.5 rounded">
                              {m.clientes.nombre}
                            </span>
                            {m.servicios_cliente && (
                              <span className="text-xs text-muted-foreground">· {m.servicios_cliente.nombre}</span>
                            )}
                          </div>
                        )}
                        {m.es_compartido && partsTotal > 0 && (
                          <div className="mt-0.5 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>Compartido · {partsCobrados}/{partsTotal} cobrado</span>
                            </div>
                            {(() => {
                              const totalMonto = m.gastos_compartidos_participantes?.reduce((acc, p) => acc + p.monto, 0) ?? 0;
                              const cobradoMonto = m.gastos_compartidos_participantes?.filter(p => p.estado === "cobrado").reduce((acc, p) => acc + p.monto, 0) ?? 0;
                              const pct = totalMonto > 0 ? Math.min(100, Math.round((cobradoMonto / totalMonto) * 100)) : 0;
                              if (totalMonto === 0) return null;
                              return (
                                <div className="space-y-0.5">
                                  <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border/40">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatMonto(cobradoMonto, m.moneda ?? "ARS")} cobrado de {formatMonto(totalMonto, m.moneda ?? "ARS")}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {m.metodo ?? "—"}
                        {m.tarjetas && <span className="ml-1">· {m.tarjetas.nombre}</span>}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right font-semibold tabular-nums",
                        m.tipo === "Ingreso" ? "text-green-400" : m.tipo === "Egreso" ? "text-red-400" : "text-muted-foreground"
                      )}>
                        {m.tipo === "Ingreso" ? "+" : m.tipo === "Egreso" ? "-" : "↔"}
                        {formatMonto(m.monto, m.moneda)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.necesidad ? (
                          <span className={cn(
                            "inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold",
                            NECESIDAD_COLORS[m.necesidad]
                          )}>
                            {m.necesidad}
                          </span>
                        ) : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {m.es_compartido && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={isExpanded ? "Cerrar" : "Ver cobros"}
                              onClick={() => setExpandedId(isExpanded ? null : m.id)}
                            >
                              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-sm" onClick={() => handleEditar(m)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDuplicar(m.id)} title="Duplicar">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleEliminar(m)} title="Eliminar" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${m.id}-panel`} className="border-b border-border bg-surface/30">
                        <td colSpan={7} className="px-6 py-2">
                          <CompartidoPanel
                            movimientoId={m.id}
                            concepto={m.concepto}
                            moneda={m.moneda ?? "ARS"}
                            cuentas={cuentas}
                          />
                        </td>
                      </tr>
                    )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden flex flex-col gap-2">
            {filtrados.map((m) => {
              const partsTotal = m.gastos_compartidos_participantes?.length ?? 0;
              const partsCobrados = m.gastos_compartidos_participantes?.filter((p) => p.estado === "cobrado").length ?? 0;
              const isExpanded = expandedId === m.id;
              return (
                <div key={m.id} className="border border-border rounded-lg bg-card overflow-hidden">
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-semibold tabular-nums",
                            m.tipo === "Ingreso" ? "text-green-400" : m.tipo === "Egreso" ? "text-red-400" : "text-muted-foreground"
                          )}>
                            {m.tipo === "Ingreso" ? "+" : m.tipo === "Egreso" ? "-" : "↔"}
                            {formatMonto(m.monto, m.moneda)}
                          </span>
                          {m.necesidad && (
                            <span className={cn(
                              "inline-flex items-center justify-center w-5 h-5 rounded-full border text-xs font-bold",
                              NECESIDAD_COLORS[m.necesidad]
                            )}>
                              {m.necesidad}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium mt-0.5 truncate">
                          {m.concepto || m.descripcion || "—"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{formatFecha(m.fecha)}</span>
                          {m.metodo && <><span>·</span><span>{m.metodo}</span></>}
                          {m.categorias && <><span>·</span><span>{m.categorias.nombre}</span></>}
                        </div>
                        {m.ambito === "Profesional" && m.clientes && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <span className="text-xs text-blue-300 bg-blue-900/20 border border-blue-800/40 px-1.5 py-0.5 rounded">
                              {m.clientes.nombre}
                            </span>
                            {m.servicios_cliente && (
                              <span className="text-xs text-muted-foreground">· {m.servicios_cliente.nombre}</span>
                            )}
                          </div>
                        )}
                        {m.es_compartido && partsTotal > 0 && (
                          <div className="mt-0.5 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>Compartido · {partsCobrados}/{partsTotal} cobrado</span>
                            </div>
                            {(() => {
                              const totalMonto = m.gastos_compartidos_participantes?.reduce((acc, p) => acc + p.monto, 0) ?? 0;
                              const cobradoMonto = m.gastos_compartidos_participantes?.filter(p => p.estado === "cobrado").reduce((acc, p) => acc + p.monto, 0) ?? 0;
                              const pct = totalMonto > 0 ? Math.min(100, Math.round((cobradoMonto / totalMonto) * 100)) : 0;
                              if (totalMonto === 0) return null;
                              return (
                                <div className="space-y-0.5">
                                  <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border/40">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatMonto(cobradoMonto, m.moneda ?? "ARS")} cobrado de {formatMonto(totalMonto, m.moneda ?? "ARS")}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {m.es_compartido && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setExpandedId(isExpanded ? null : m.id)}
                          >
                            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEditar(m)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDuplicar(m.id)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEliminar(m)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border/50 bg-surface/30">
                      <CompartidoPanel
                        movimientoId={m.id}
                        concepto={m.concepto}
                        moneda={m.moneda ?? "ARS"}
                        cuentas={cuentas}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Paginación simple */}
          {total > filtrados.length && (
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">
                Mostrando {filtrados.length} de {total}
              </p>
              <Button variant="ghost" size="sm" className="mt-1 gap-1" onClick={() => {
                const url = new URL(window.location.href);
                const pagina = parseInt(url.searchParams.get("pagina") ?? "0") + 1;
                url.searchParams.set("pagina", String(pagina));
                router.push(url.toString());
              }}>
                Cargar más <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Editor modal */}
      <MovimientoEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editing={editing}
        cuentas={cuentas}
        tarjetas={tarjetas}
        categorias={categorias}
        clientes={clientes}
        personas={personas}
        grupos={grupos}
      />
    </div>
  );
}
