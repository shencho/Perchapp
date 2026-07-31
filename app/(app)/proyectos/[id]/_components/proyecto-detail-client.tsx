"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, ArrowRight, Check, UserPlus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { DeleteConfirm } from "@/components/shared/delete-confirm";
import { cn } from "@/lib/utils";
import {
  addProyectoGasto, deleteProyectoGasto, saldarProyecto, addMiembro, removeMiembro,
} from "@/lib/supabase/actions/proyectos";
import type { ProyectoDetalle } from "@/lib/supabase/actions/proyectos-types";
import type { Persona } from "@/types/supabase";

interface Props {
  detalle: ProyectoDetalle;
  cuentas: { id: string; nombre: string }[];
  personasConectadas: Persona[];
}

function fmt(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: moneda, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}
function today() { return new Date().toISOString().slice(0, 10); }
function r2(n: number) { return Math.round(n * 100) / 100; }

export function ProyectoDetailClient({ detalle, personasConectadas }: Props) {
  const router = useRouter();
  const { proyecto, miembros, gastos, balances, esOwner, miMiembroId } = detalle;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Gasto editor ───────────────────────────────────────────────────────────
  const [showGasto, setShowGasto] = useState(false);
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(today());
  const [moneda, setMoneda] = useState(proyecto.moneda_default);
  const [pagadorId, setPagadorId] = useState<string>(miMiembroId ?? miembros[0]?.id ?? "");
  const [entre, setEntre] = useState<Set<string>>(new Set(miembros.map((m) => m.id)));

  function openGasto() {
    setConcepto(""); setMonto(""); setFecha(today()); setMoneda(proyecto.moneda_default);
    setPagadorId(miMiembroId ?? miembros[0]?.id ?? "");
    setEntre(new Set(miembros.map((m) => m.id)));
    setError(null); setShowGasto(true);
  }
  function toggleEntre(id: string) {
    setEntre((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function handleAddGasto(e: React.FormEvent) {
    e.preventDefault();
    const total = parseFloat(monto);
    if (!total || total <= 0) { setError("Monto inválido"); return; }
    if (!pagadorId) { setError("Elegí quién pagó"); return; }
    const ids = Array.from(entre);
    if (ids.length === 0) { setError("Elegí entre quiénes se divide"); return; }
    setBusy(true); setError(null);
    try {
      const base = r2(total / ids.length);
      const splits = ids.map((miembroId, i) => ({
        miembroId,
        // el primero absorbe el redondeo para cerrar exacto
        montoConsumido: i === 0 ? r2(total - base * (ids.length - 1)) : base,
        modo: "a_repartir" as const,
      }));
      await addProyectoGasto({
        proyectoId: proyecto.id,
        concepto: concepto.trim() || null,
        montoTotal: total,
        moneda,
        fecha,
        pagadores: [{ miembroId: pagadorId, montoPagado: total }],
        splits,
      });
      setShowGasto(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar gasto");
    } finally { setBusy(false); }
  }

  // ── Delete gasto ─────────────────────────────────────────────────────────────
  const [deleteGastoId, setDeleteGastoId] = useState<string | null>(null);
  async function handleDeleteGasto() {
    if (!deleteGastoId) return;
    setBusy(true);
    try {
      await deleteProyectoGasto(deleteGastoId, proyecto.id);
      setDeleteGastoId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al borrar");
    } finally { setBusy(false); }
  }

  // ── Saldar ─────────────────────────────────────────────────────────────────
  async function handleSaldar(mon: string) {
    setBusy(true); setError(null);
    try {
      const { creadas } = await saldarProyecto(proyecto.id, mon);
      router.refresh();
      if (creadas === 0) setError("No se generaron deudas nuevas (¿ya saldado o sin usuarios conectados?).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al saldar");
    } finally { setBusy(false); }
  }

  // ── Add miembro ──────────────────────────────────────────────────────────────
  const [showMiembro, setShowMiembro] = useState(false);
  const yaMiembroUsuarios = new Set(miembros.map((m) => m.usuario_id).filter(Boolean));
  const disponibles = personasConectadas.filter((p) => !yaMiembroUsuarios.has(p.usuario_vinculado_id));

  async function handleAddMiembro(persona: Persona) {
    setBusy(true); setError(null);
    try {
      await addMiembro(proyecto.id, { usuarioId: persona.usuario_vinculado_id, nombre: persona.nombre });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  }
  async function handleRemoveMiembro(miembroId: string) {
    setBusy(true);
    try {
      await removeMiembro(miembroId, proyecto.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  }

  const nombreMiembro = (id: string | null) =>
    id ? (miembros.find((m) => m.id === id)?.nombre ?? "Miembro") : "Vos";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/gastos-compartidos" className="text-muted-foreground hover:text-foreground mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">{proyecto.nombre}</h1>
            <p className="text-xs text-muted-foreground capitalize">
              {proyecto.tipo} · {miembros.length} miembros
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openGasto}>
          <Plus className="h-4 w-4 mr-1" /> Cargar gasto
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Balances por moneda */}
      {balances.map((b) => (
        <div key={b.moneda} className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Saldos ({b.moneda})</h2>
            {b.resultado.transferencias.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => handleSaldar(b.moneda)} disabled={busy}>
                <Check className="h-3.5 w-3.5 mr-1" /> Saldar
              </Button>
            )}
          </div>
          {/* Netos por miembro */}
          <div className="flex flex-col gap-1">
            {b.resultado.personas.map((p) => (
              <div key={p.personaId ?? "yo"} className="flex items-center justify-between text-sm">
                <span>{p.nombre}</span>
                <span className={cn(
                  "tabular-nums font-mono font-medium",
                  p.neto > 0.005 ? "text-success" : p.neto < -0.005 ? "text-danger" : "text-muted-foreground",
                )}>
                  {p.neto > 0.005 ? "+" : ""}{fmt(p.neto, b.moneda)}
                </span>
              </div>
            ))}
          </div>
          {/* Transferencias mínimas */}
          {b.resultado.transferencias.length > 0 && (
            <div className="flex flex-col gap-1 pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground">Para saldar:</p>
              {b.resultado.transferencias.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{t.deudorNombre}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{t.acreedorNombre}</span>
                  <span className="ml-auto tabular-nums font-mono">{fmt(t.monto, b.moneda)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Gastos */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Gastos</h2>
        {gastos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
            Todavía no hay gastos. Cargá el primero.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {gastos.map((g) => {
              const pagador = g.pagadores[0] ? nombreMiembro(g.pagadores[0].miembro_id) : "—";
              const puedoBorrar = g.creado_por === detalle.miUsuarioId;
              return (
                <div key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{g.concepto || "Sin concepto"}</p>
                    <p className="text-xs text-muted-foreground">
                      Pagó {pagador} · {g.splits.length} personas
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm tabular-nums font-mono font-medium">{fmt(g.monto_total, g.moneda)}</span>
                    {puedoBorrar && (
                      <Button
                        size="icon-sm" variant="ghost"
                        onClick={() => setDeleteGastoId(g.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Miembros */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Miembros</h2>
          {esOwner && disponibles.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setShowMiembro(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {miembros.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface text-xs border border-border">
              {m.nombre}
              {m.rol === "owner" && <span className="text-[10px] text-muted-foreground">(owner)</span>}
              {esOwner && m.rol !== "owner" && (
                <button onClick={() => handleRemoveMiembro(m.id)} className="text-muted-foreground hover:text-destructive" disabled={busy}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* ── Gasto editor dialog ── */}
      <FormDialog
        open={showGasto}
        onOpenChange={setShowGasto}
        title="Cargar gasto"
        onSubmit={handleAddGasto}
        isSubmitting={busy}
        submitLabel="Guardar"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>Concepto</Label>
            <Input autoFocus placeholder="Ej. Cena, nafta…" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Monto total</Label>
            <Input type="number" inputMode="decimal" placeholder="0" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Moneda</Label>
            <NamedSelect
              options={[{ value: "ARS", label: "ARS" }, { value: "USD", label: "USD" }]}
              value={moneda} onValueChange={(v) => setMoneda(v || "ARS")} className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Pagó</Label>
            <NamedSelect
              options={miembros.map((m) => ({ value: m.id, label: m.nombre }))}
              value={pagadorId} onValueChange={(v) => setPagadorId(v ?? "")} className="w-full"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Se divide entre</Label>
          <div className="border border-border rounded-lg overflow-hidden">
            {miembros.map((m) => {
              const checked = entre.has(m.id);
              return (
                <button
                  key={m.id} type="button" onClick={() => toggleEntre(m.id)}
                  className="flex items-center gap-3 w-full px-3 py-2 border-b border-border last:border-b-0 text-sm hover:bg-surface/60 text-left"
                >
                  <span className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border shrink-0 text-[10px]",
                    checked ? "bg-primary border-primary text-primary-foreground" : "border-border",
                  )}>
                    {checked && "✓"}
                  </span>
                  {m.nombre}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Se divide en partes iguales entre los seleccionados.</p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </FormDialog>

      {/* ── Add miembro dialog ── */}
      {showMiembro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMiembro(false)} />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Agregar miembro</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowMiembro(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {disponibles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { handleAddMiembro(p); setShowMiembro(false); }}
                  disabled={busy}
                  className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-surface/60 text-left"
                >
                  {p.nombre}
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <DeleteConfirm
        open={!!deleteGastoId}
        onOpenChange={(v) => !v && setDeleteGastoId(null)}
        title="¿Borrar gasto?"
        description="Se quitará del proyecto y del balance."
        onConfirm={handleDeleteGasto}
        isDeleting={busy}
      />
    </div>
  );
}
