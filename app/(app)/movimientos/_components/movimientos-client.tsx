"use client";

import { useEffect, useState, useTransition, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Copy, Trash2, Search, ChevronDown, ChevronLeft, ChevronRight, Users, Landmark, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NamedSelect } from "@/components/ui/named-select";
import { deleteMovimiento, deleteGrupoCuotas } from "@/lib/supabase/actions/movimientos";
import {
  getParticipantes,
  marcarCobrado,
  marcarPendiente,
  getBalanceGasto,
} from "@/lib/supabase/actions/gastos-compartidos";
import type { ResultadoBalanceGrupal } from "@/lib/domain/calcularBalanceGrupal";
import { TIPOS_MOV, METODOS } from "@/lib/supabase/actions/movimientos-types";
import { MovimientoEditor } from "./movimiento-editor";
import { GenerarPendientesModal } from "./generar-pendientes-modal";
import type { Movimiento, Cuenta, Tarjeta, Categoria, Persona, GastoCompartidoParticipante } from "@/types/supabase";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";
import type { PlantillaConEstado } from "@/lib/domain/plantillas";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type MovimientoConRelaciones = Movimiento & {
  categorias?: { id: string; nombre: string; tipo: string; parent_id: string | null } | null;
  cuentas?: { id: string; nombre: string; tipo: string } | null;
  cuenta_destino?: { id: string; nombre: string } | null;
  tarjetas?: { id: string; nombre: string } | null;
  gastos_compartidos_participantes?: { id: string; estado: string; monto: number; persona_id: string | null }[] | null;
  prestamos?: { id: string; tipo: string; institucion_nombre: string | null; persona_id: string | null; personas?: { nombre: string } | null } | null;
};

interface Props {
  movimientos: MovimientoConRelaciones[];
  total: number;
  totales?: Record<string, { ingreso: number; egreso: number }>;
  pagina?: number;
  porPagina?: number;
  busquedaInicial?: string;
  tipoInicial?: string;
  metodoInicial?: string;
  cuentaInicial?: string;
  categoriaInicial?: string;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  personas: Persona[];
  grupos: GrupoConMiembros[];
  mesActual: string;
  compartidoInicial?: boolean;
  nombreUsuario?: string;
  plantillasPendientes?: PlantillaConEstado[];
  generarInicialId?: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const NECESIDAD_COLORS: Record<number, string> = {
  1: "bg-danger/10 text-danger border-danger/20",
  2: "bg-warning/10 text-warning border-warning/20",
  3: "bg-warning/10 text-warning border-warning/20",
  4: "bg-success/10 text-success border-success/20",
  5: "bg-success/10 text-success border-success/20",
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

// Muestra el concepto sin el sufijo "(cuota i/N)" (se ve como badge aparte).
function conceptoBase(m: { concepto: string | null; descripcion: string | null }) {
  return (m.concepto || m.descripcion || "—").replace(/\s*\(cuota\s*\d+\/\d+\)\s*$/i, "");
}

function nombrePrestamo(m: MovimientoConRelaciones): string | null {
  if (!m.prestamos) return null;
  const p = m.prestamos;
  if (p.tipo === "bancario") return p.institucion_nombre ?? "Institución";
  const persona = p.personas?.nombre ?? "Persona";
  return p.tipo === "otorgado" ? `Préstamo a ${persona}` : `Préstamo de ${persona}`;
}

// ── CompartidoPanel ───────────────────────────────────────────────────────────

function CompartidoPanel({
  movimientoId,
  concepto,
  moneda,
  montoGasto,
  cuentas,
  nombreUsuario = "Vos",
}: {
  movimientoId: string;
  concepto: string | null;
  moneda: string;
  montoGasto: number;
  cuentas: Cuenta[];
  nombreUsuario?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [participantes, setParticipantes] = useState<GastoCompartidoParticipante[] | null>(null);
  const [balance, setBalance] = useState<ResultadoBalanceGrupal | null>(null);
  const [activeTab, setActiveTab] = useState<"cobros" | "balance">("cobros");
  const [cobradoFormId, setCobradoFormId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(todayStr());
  const [cuentaDestinoId, setCuentaDestinoId] = useState<string | null>(null);
  const [observacion, setObservacion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      getParticipantes(movimientoId),
      getBalanceGasto(movimientoId, montoGasto, nombreUsuario),
    ]).then(([parts, bal]) => {
      setParticipantes(parts);
      setBalance(bal);
    }).catch(() => {
      setParticipantes([]);
      setBalance(null);
    });
  }, [movimientoId, montoGasto, nombreUsuario]);

  async function reload() {
    const [updated, bal] = await Promise.all([
      getParticipantes(movimientoId),
      getBalanceGasto(movimientoId, montoGasto, nombreUsuario),
    ]);
    setParticipantes(updated);
    setBalance(bal);
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

  function handleSaldar(deudorPersonaId: string | null) {
    const part = participantes?.find(p => p.persona_id === deudorPersonaId && p.estado === "pendiente");
    if (part) {
      setActiveTab("cobros");
      setCobradoFormId(part.id);
      setFecha(todayStr());
      setCuentaDestinoId(null);
      setObservacion("");
    }
  }

  if (!participantes || !balance) {
    return <p className="text-xs text-muted-foreground py-2">Cargando…</p>;
  }

  const hasParticipantes = participantes.length > 0;
  const hasBalance = balance.personas.length > 0;

  if (!hasParticipantes && !hasBalance) {
    return <p className="text-xs text-muted-foreground py-2">Sin participantes registrados.</p>;
  }

  return (
    <div className="space-y-2 py-1">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-border/50">
        <button
          onClick={() => setActiveTab("cobros")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors",
            activeTab === "cobros"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Cobros
        </button>
        <button
          onClick={() => setActiveTab("balance")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors",
            activeTab === "balance"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Balance grupal
        </button>
      </div>

      {/* Tab: Cobros */}
      {activeTab === "cobros" && (
        <div className="space-y-2 pt-1">
          {participantes.filter(p => p.persona_id !== null).length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Sin participantes registrados.</p>
          ) : (
            participantes.filter(p => p.persona_id !== null).map((p) => (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{p.persona_nombre}</span>
                  <span className="text-sm tabular-nums font-mono text-muted-foreground">
                    {formatMonto(p.monto, moneda)}
                  </span>
                  {p.estado === "cobrado" ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
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
            ))
          )}
        </div>
      )}

      {/* Tab: Balance grupal */}
      {activeTab === "balance" && (
        <div className="space-y-3 pt-1">
          {!hasBalance ? (
            <p className="text-xs text-muted-foreground py-2">No hay datos de balance disponibles.</p>
          ) : (
            <>
              {/* Tabla de personas */}
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Persona</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Pagó</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Consumió</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balance.personas.map((p) => (
                      <tr key={p.personaId ?? "__usuario__"} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-2 font-medium">
                          {p.nombre}
                          {p.personaId === null && (
                            <span className="ml-1 text-muted-foreground font-normal">(vos)</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono text-muted-foreground">
                          {p.pagado > 0 ? formatMonto(p.pagado, moneda) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono text-muted-foreground">
                          {p.consumido > 0 ? formatMonto(p.consumido, moneda) : "—"}
                        </td>
                        <td className={cn(
                          "px-3 py-2 text-right tabular-nums font-mono font-semibold",
                          p.neto > 0 ? "text-success" : p.neto < 0 ? "text-danger" : "text-muted-foreground"
                        )}>
                          {p.neto > 0 ? "+" : ""}{formatMonto(p.neto, moneda)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Transferencias para saldar */}
              {balance.transferencias.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Transferencias para saldar</p>
                  {balance.transferencias.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-surface/50 border border-border/50">
                      <div className="flex items-center gap-1.5 text-xs min-w-0">
                        <span className="font-medium truncate">{t.deudorNombre}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{t.acreedorNombre}</span>
                        <span className="tabular-nums font-mono text-muted-foreground ml-1 shrink-0">
                          {formatMonto(t.monto, moneda)}
                        </span>
                      </div>
                      {t.acreedorId === null && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2 shrink-0"
                          onClick={() => handleSaldar(t.deudorId)}
                        >
                          Saldar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {balance.hayDesbalance && (
                <p className="text-xs text-warning bg-warning/10 border border-warning/20 rounded px-2 py-1">
                  ⚠ Total pagado ≠ total consumido. Puede haber pagadores fuera de este gasto.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Genera lista de los últimos 12 meses para el filtro
// Meses disponibles: incluye FUTUROS (para ver cuotas ya materializadas) y pasados.
const MESES_FUTUROS = 12;
const MESES_PASADOS = 12;

function mesValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMes(value: string) {
  return new Date(`${value}-01T12:00:00`).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

// `seleccionado` se inyecta si cae fuera de la ventana (p. ej. al navegar con las flechas).
function getMeses(seleccionado?: string) {
  const meses: { value: string; label: string }[] = [
    { value: "todos", label: "Todos los movimientos" },
  ];
  const now = new Date();
  // De los futuros (más lejano primero) hasta los pasados, en orden descendente.
  for (let i = MESES_FUTUROS; i > -MESES_PASADOS; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    meses.push({ value: mesValue(d), label: labelMes(mesValue(d)) });
  }
  if (seleccionado && seleccionado !== "todos" && !meses.some((m) => m.value === seleccionado)) {
    // Insertar respetando el orden descendente por valor.
    const item = { value: seleccionado, label: labelMes(seleccionado) };
    const idx = meses.findIndex((m, i) => i > 0 && m.value < seleccionado);
    if (idx === -1) meses.push(item); else meses.splice(idx, 0, item);
  }
  return meses;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MovimientosClient({ movimientos, total, totales = {}, pagina = 0, porPagina = 25, busquedaInicial = "", tipoInicial = "todos", metodoInicial = "todos", cuentaInicial = "todas", categoriaInicial = "todas", cuentas, tarjetas, categorias, personas, grupos, mesActual, compartidoInicial, nombreUsuario, plantillasPendientes = [], generarInicialId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [editorOpen, setEditorOpen]     = useState(false);
  const [editing, setEditing]           = useState<Movimiento | null>(null);
  const [duplicando, setDuplicando]     = useState<Movimiento | null>(null);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [generarOpen, setGenerarOpen]   = useState(!!generarInicialId);

  // Búsqueda: estado local para tipear, con debounce → searchParam `q` (server-side).
  const [busqueda, setBusqueda] = useState(busquedaInicial);

  const filtroMes = mesActual;
  const filtroTipo = tipoInicial;
  const filtroMetodo = metodoInicial;
  const filtroCuenta = cuentaInicial;
  const filtroCategoria = categoriaInicial;
  const filtroCompartido = compartidoInicial ?? false;

  const meses = getMeses(mesActual);
  const catsPadre = categorias.filter((c) => !c.parent_id);

  // El servidor ya aplica todos los filtros (mes, búsqueda, tipo, método, cuenta,
  // categoría, compartido) sobre TODA la lista → acá solo mostramos la página.
  const filtrados = movimientos;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  // Setea/borra searchParams (por defecto resetea la página).
  function setParam(updates: Record<string, string | null>, resetPagina = true) {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    }
    if (resetPagina) url.searchParams.delete("pagina");
    startTransition(() => router.push(url.toString()));
  }

  // Debounce de la búsqueda hacia el searchParam.
  useEffect(() => {
    const t = setTimeout(() => {
      if (busqueda.trim() !== busquedaInicial) setParam({ q: busqueda.trim() || null });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  function handleNuevo() {
    setDuplicando(null);
    setEditing(null);
    setEditorOpen(true);
  }

  function handleEditar(m: Movimiento) {
    setDuplicando(null);
    setEditing(m);
    setEditorOpen(true);
  }

  // #5: duplicar abre el editor pre-cargado (crear), para editar antes de guardar.
  function handleDuplicar(m: Movimiento) {
    setEditing(null);
    setDuplicando(m);
    setEditorOpen(true);
  }

  async function handleEliminar(m: MovimientoConRelaciones) {
    const prestamo = nombrePrestamo(m);

    // Gasto en cuotas: ofrecer borrar todas las cuotas del grupo.
    if (m.cuota_grupo_id) {
      const total = m.cuotas ?? 0;
      const borrarTodas = confirm(
        `Este gasto tiene ${total} cuotas.\nAceptar = borrar TODAS las cuotas.\nCancelar = borrar solo esta cuota (${m.cuota_numero}/${total}).`
      );
      if (borrarTodas) {
        await deleteGrupoCuotas(m.cuota_grupo_id);
      } else {
        await deleteMovimiento(m.id);
      }
      startTransition(() => router.refresh());
      return;
    }

    const msg = prestamo
      ? `⚠ Este movimiento está vinculado al préstamo "${prestamo}". Eliminarlo desvinculará el pago del préstamo. ¿Confirmás?`
      : "¿Eliminar este movimiento?";

    if (!confirm(msg)) return;
    await deleteMovimiento(m.id);
    startTransition(() => router.refresh());
  }

  function handleMesChange(mes: string | null) {
    if (mes) setParam({ mes });
  }

  // Avanza/retrocede un mes con las flechas (desde "todos" arranca en el mes actual).
  function stepMes(delta: number) {
    const base = filtroMes === "todos" ? new Date() : new Date(`${filtroMes}-01T12:00:00`);
    const d = new Date(base.getFullYear(), base.getMonth() + delta, 1);
    setParam({ mes: mesValue(d) });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Movimientos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{total} registros</p>
        </div>
        <div className="flex items-center gap-2">
          {plantillasPendientes.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setGenerarOpen(true)} className="gap-1.5">
              {(() => {
                const e = plantillasPendientes.filter(p => p.plantilla.tipo !== "Ingreso").length;
                const i = plantillasPendientes.filter(p => p.plantilla.tipo === "Ingreso").length;
                if (e > 0 && i > 0) return `Generar pendientes (${e} egresos + ${i} ingresos)`;
                if (i > 0) return `Generar pendientes (${i} ingreso${i !== 1 ? "s" : ""})`;
                return `Generar pendientes (${e} egreso${e !== 1 ? "s" : ""})`;
              })()}
            </Button>
          )}
          <Button onClick={handleNuevo} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
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

        {/* Mes con flechas ‹ › (permite ver meses futuros: cuotas ya cargadas) */}
        <div className="flex items-center gap-1">
          <Button
            type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0"
            onClick={() => stepMes(-1)} title="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <NamedSelect
            options={meses}
            value={filtroMes}
            onValueChange={(v) => v && handleMesChange(v)}
            className={cn("h-8 text-sm", filtroMes === "todos" ? "w-52" : "w-40")}
          />
          <Button
            type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0"
            onClick={() => stepMes(1)} title="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Tipo — muestra "Tipo" (muted) cuando no hay filtro */}
        <NamedSelect
          options={[{ value: "todos", label: "Todos los tipos" }, ...TIPOS_MOV.map(t => ({ value: t, label: t }))]}
          value={filtroTipo !== "todos" ? filtroTipo : ""}
          onValueChange={(v) => setParam({ tipo: v && v !== "todos" ? v : null })}
          placeholder="Tipo"
          className={cn("h-8 text-sm w-36", filtroTipo !== "todos" && "ring-1 ring-primary/50 border-primary/50")}
        />

        {/* Método */}
        <NamedSelect
          options={[{ value: "todos", label: "Todos los métodos" }, ...METODOS.map(m => ({ value: m, label: m }))]}
          value={filtroMetodo !== "todos" ? filtroMetodo : ""}
          onValueChange={(v) => setParam({ metodo: v && v !== "todos" ? v : null })}
          placeholder="Método"
          className={cn("h-8 text-sm w-40", filtroMetodo !== "todos" && "ring-1 ring-primary/50 border-primary/50")}
        />

        {/* Cuenta — usa UUIDs como valores */}
        <NamedSelect
          options={[{ value: "todas", label: "Todas las cuentas" }, ...cuentas.map(c => ({ value: c.id, label: c.nombre }))]}
          value={filtroCuenta !== "todas" ? filtroCuenta : ""}
          onValueChange={(v) => setParam({ cuenta: v && v !== "todas" ? v : null })}
          placeholder="Cuenta"
          className={cn("h-8 text-sm w-36", filtroCuenta !== "todas" && "ring-1 ring-primary/50 border-primary/50")}
        />

        {/* Categoría — usa UUIDs como valores */}
        <NamedSelect
          options={[{ value: "todas", label: "Todas las categorías" }, ...catsPadre.map(c => ({ value: c.id, label: c.nombre }))]}
          value={filtroCategoria !== "todas" ? filtroCategoria : ""}
          onValueChange={(v) => setParam({ categoria: v && v !== "todas" ? v : null })}
          placeholder="Categoría"
          className={cn("h-8 text-sm w-40", filtroCategoria !== "todas" && "ring-1 ring-primary/50 border-primary/50")}
        />

        {/* Compartidos */}
        <button
          onClick={() => setParam({ compartido: filtroCompartido ? null : "true" })}
          className={cn(
            "h-8 flex items-center gap-1.5 px-3 text-sm rounded-md border transition-colors",
            filtroCompartido
              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/50"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-surface"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Compartidos
        </button>
      </div>

      {/* Totales del set filtrado, por moneda (#10) */}
      {Object.keys(totales).length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-border bg-surface/40 px-4 py-2 text-xs">
          <span className="text-muted-foreground">Totales filtrados:</span>
          {Object.entries(totales).map(([moneda, t]) => (
            <span key={moneda} className="flex items-center gap-2">
              <span className="font-medium">{moneda}</span>
              <span className="text-success tabular-nums font-mono">+{formatMonto(t.ingreso, moneda)}</span>
              <span className="text-danger tabular-nums font-mono">-{formatMonto(t.egreso, moneda)}</span>
              <span className={cn("tabular-nums font-mono font-semibold", (t.ingreso - t.egreso) >= 0 ? "text-foreground" : "text-danger")}>
                neto {formatMonto(t.ingreso - t.egreso, moneda)}
              </span>
            </span>
          ))}
        </div>
      )}

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
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concepto</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Método</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">N</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m) => {
                  // Solo participantes cobrables (excluye la fila propia "Vos" con persona_id null).
                  const cobrables = m.gastos_compartidos_participantes?.filter((p) => p.persona_id !== null) ?? [];
                  const partsTotal = cobrables.length;
                  const partsCobrados = cobrables.filter((p) => p.estado === "cobrado").length;
                  const isExpanded = expandedId === m.id;
                  return (
                    <Fragment key={m.id}>
                    <tr className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatFecha(m.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium max-w-[220px] flex items-center gap-1.5">
                          <span className="truncate">{conceptoBase(m)}</span>
                          {m.cuota_numero && (
                            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full bg-info/10 text-info border border-info/20 text-[10px] font-medium">
                              {m.cuota_numero}/{m.cuotas}
                            </span>
                          )}
                        </div>
                        {m.categorias && (
                          <div className="text-xs text-muted-foreground">{m.categorias.nombre}</div>
                        )}
                        {m.es_compartido && partsTotal > 0 && (
                          <div className="mt-0.5 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>Compartido · {partsCobrados}/{partsTotal} cobrado</span>
                            </div>
                            {(() => {
                              const totalMonto = cobrables.reduce((acc, p) => acc + p.monto, 0);
                              const cobradoMonto = cobrables.filter(p => p.estado === "cobrado").reduce((acc, p) => acc + p.monto, 0);
                              const pct = totalMonto > 0 ? Math.min(100, Math.round((cobradoMonto / totalMonto) * 100)) : 0;
                              if (totalMonto === 0) return null;
                              return (
                                <div className="space-y-0.5">
                                  <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border/40">
                                    <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatMonto(cobradoMonto, m.moneda ?? "ARS")} cobrado de {formatMonto(totalMonto, m.moneda ?? "ARS")}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {m.prestamos && (
                          <a
                            href={`/prestamos/${m.prestamos.id}`}
                            onClick={(e) => { e.stopPropagation(); }}
                            className="inline-flex items-center gap-1 mt-0.5 text-xs text-info bg-info/10 border border-info/20 px-1.5 py-0.5 rounded hover:bg-info/10 transition-colors"
                          >
                            <Landmark className="h-3 w-3" />
                            {nombrePrestamo(m)}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {m.metodo ?? "—"}
                        {m.tarjetas && <span className="ml-1">· {m.tarjetas.nombre}</span>}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right font-semibold tabular-nums font-mono",
                        m.tipo === "Ingreso" ? "text-success" : m.tipo === "Egreso" ? "text-danger" : "text-muted-foreground"
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
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDuplicar(m)} title="Duplicar">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleEliminar(m)} title="Eliminar" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border bg-surface/30">
                        <td colSpan={6} className="px-6 py-2">
                          <CompartidoPanel
                            movimientoId={m.id}
                            concepto={m.concepto}
                            moneda={m.moneda ?? "ARS"}
                            montoGasto={m.monto}
                            cuentas={cuentas}
                            nombreUsuario={nombreUsuario}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden flex flex-col gap-2">
            {filtrados.map((m) => {
              // Solo participantes cobrables (excluye la fila propia "Vos" con persona_id null).
              const cobrables = m.gastos_compartidos_participantes?.filter((p) => p.persona_id !== null) ?? [];
              const partsTotal = cobrables.length;
              const partsCobrados = cobrables.filter((p) => p.estado === "cobrado").length;
              const isExpanded = expandedId === m.id;
              return (
                <div key={m.id} className="border border-border rounded-lg bg-card overflow-hidden">
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-semibold tabular-nums font-mono",
                            m.tipo === "Ingreso" ? "text-success" : m.tipo === "Egreso" ? "text-danger" : "text-muted-foreground"
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
                        <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5">
                          <span className="truncate">{conceptoBase(m)}</span>
                          {m.cuota_numero && (
                            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full bg-info/10 text-info border border-info/20 text-[10px] font-medium">
                              {m.cuota_numero}/{m.cuotas}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{formatFecha(m.fecha)}</span>
                          {m.metodo && <><span>·</span><span>{m.metodo}</span></>}
                          {m.categorias && <><span>·</span><span>{m.categorias.nombre}</span></>}
                        </div>
                        {m.es_compartido && partsTotal > 0 && (
                          <div className="mt-0.5 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>Compartido · {partsCobrados}/{partsTotal} cobrado</span>
                            </div>
                            {(() => {
                              const totalMonto = cobrables.reduce((acc, p) => acc + p.monto, 0);
                              const cobradoMonto = cobrables.filter(p => p.estado === "cobrado").reduce((acc, p) => acc + p.monto, 0);
                              const pct = totalMonto > 0 ? Math.min(100, Math.round((cobradoMonto / totalMonto) * 100)) : 0;
                              if (totalMonto === 0) return null;
                              return (
                                <div className="space-y-0.5">
                                  <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border/40">
                                    <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatMonto(cobradoMonto, m.moneda ?? "ARS")} cobrado de {formatMonto(totalMonto, m.moneda ?? "ARS")}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {m.prestamos && (
                          <a
                            href={`/prestamos/${m.prestamos.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 mt-1 text-xs text-info bg-info/10 border border-info/20 px-1.5 py-0.5 rounded hover:bg-info/10 transition-colors"
                          >
                            <Landmark className="h-3 w-3" />
                            {nombrePrestamo(m)}
                          </a>
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
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDuplicar(m)}>
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
                        montoGasto={m.monto}
                        cuentas={cuentas}
                        nombreUsuario={nombreUsuario}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Paginación real + tamaño de página (#12) */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Por página:</span>
              <NamedSelect
                options={[25, 50, 75, 100].map((n) => ({ value: String(n), label: String(n) }))}
                value={String(porPagina)}
                onValueChange={(v) => v && setParam({ porPagina: v })}
                className="h-7 w-20 text-xs"
              />
              <span className="ml-1">{total} registros</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm" className="h-7 px-2"
                disabled={pagina <= 0}
                onClick={() => setParam({ pagina: String(pagina - 1) }, false)}
              >
                ‹ Anterior
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Página {pagina + 1} de {totalPaginas}
              </span>
              <Button
                variant="outline" size="sm" className="h-7 px-2"
                disabled={pagina + 1 >= totalPaginas}
                onClick={() => setParam({ pagina: String(pagina + 1) }, false)}
              >
                Siguiente ›
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Editor modal */}
      <MovimientoEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editing={editing}
        duplicando={duplicando}
        cuentas={cuentas}
        tarjetas={tarjetas}
        categorias={categorias}
        personas={personas}
        grupos={grupos}
      />

      {/* Modal plantillas pendientes */}
      <GenerarPendientesModal
        open={generarOpen}
        onClose={() => setGenerarOpen(false)}
        plantillasPendientes={plantillasPendientes}
        initialSelectedId={generarInicialId}
      />
    </div>
  );
}
