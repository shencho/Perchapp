"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  createBugReport, updateBugReport, deleteBugReport,
} from "@/lib/supabase/actions/bug-reports";
import type { BugReport } from "@/types/supabase";

const SECTORES = [
  "Movimientos", "Cuotas", "Tarjetas", "Cuentas", "IA/Interpret",
  "Gastos compartidos", "Proyectos", "Conexiones", "Navegación/UI",
  "Dashboard", "Otro",
];

const ESTADOS: Record<string, { label: string; cls: string }> = {
  nuevo:       { label: "Nuevo",       cls: "bg-danger/10 text-danger border-danger/20" },
  en_progreso: { label: "En progreso", cls: "bg-warning/10 text-warning border-warning/20" },
  resuelto:    { label: "Resuelto",    cls: "bg-success/10 text-success border-success/20" },
};

function fechaCorta(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function ControlClient({ bugs }: { bugs: BugReport[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<string>("todos");

  // Alta
  const [showNew, setShowNew] = useState(false);
  const [sector, setSector] = useState(SECTORES[0]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) { setError("Poné un título"); return; }
    setSaving(true); setError(null);
    try {
      await createBugReport({ sector, titulo, descripcion });
      setShowNew(false); setTitulo(""); setDescripcion(""); setSector(SECTORES[0]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  }

  const visibles = bugs.filter((b) => filtro === "todos" || b.estado === filtro);
  const sectores = Array.from(new Set(visibles.map((b) => b.sector)));
  const counts = {
    nuevo: bugs.filter((b) => b.estado === "nuevo").length,
    en_progreso: bugs.filter((b) => b.estado === "en_progreso").length,
    resuelto: bugs.filter((b) => b.estado === "resuelto").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Tablero de control</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bugs y mejoras por sector · {counts.nuevo} nuevos · {counts.en_progreso} en progreso · {counts.resuelto} resueltos
          </p>
        </div>
        <Button size="sm" onClick={() => { setError(null); setShowNew(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Reportar
        </Button>
      </div>

      <Tabs value={filtro} onValueChange={(v) => setFiltro(String(v))}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="nuevo">Nuevos</TabsTrigger>
          <TabsTrigger value="en_progreso">En progreso</TabsTrigger>
          <TabsTrigger value="resuelto">Resueltos</TabsTrigger>
        </TabsList>

        <TabsContent value={filtro} className="pt-4 flex flex-col gap-6">
          {sectores.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
              No hay reportes en este filtro.
            </p>
          ) : (
            sectores.map((sec) => (
              <div key={sec} className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{sec}</h2>
                <div className="flex flex-col gap-2">
                  {visibles.filter((b) => b.sector === sec).map((b) => (
                    <BugRow key={b.id} bug={b} onChanged={() => router.refresh()} />
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <FormDialog
        open={showNew}
        onOpenChange={setShowNew}
        title="Reportar bug / mejora"
        onSubmit={handleCrear}
        isSubmitting={saving}
        submitLabel="Crear"
      >
        <div className="flex flex-col gap-1.5">
          <Label>Sector</Label>
          <NamedSelect className="w-full" options={SECTORES.map((s) => ({ value: s, label: s }))} value={sector} onValueChange={(v) => setSector(v ?? SECTORES[0])} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Título</Label>
          <Input autoFocus placeholder="Qué pasa / qué mejorar" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Descripción</Label>
          <textarea
            className="min-h-20 rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Detalle, cómo reproducirlo…"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </FormDialog>
    </div>
  );
}

function BugRow({ bug, onChanged }: { bug: BugReport; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [estado, setEstado] = useState(bug.estado);
  const [diagnostico, setDiagnostico] = useState(bug.diagnostico ?? "");
  const [fix, setFix] = useState(bug.fix_descripcion ?? "");
  const [busy, setBusy] = useState(false);
  const est = ESTADOS[bug.estado] ?? ESTADOS.nuevo;

  async function guardar() {
    setBusy(true);
    try {
      await updateBugReport(bug.id, {
        estado,
        diagnostico: diagnostico.trim() || null,
        fix_descripcion: fix.trim() || null,
      });
      onChanged();
    } finally { setBusy(false); }
  }
  async function borrar() {
    setBusy(true);
    try { await deleteBugReport(bug.id); onChanged(); } finally { setBusy(false); }
  }

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border shrink-0", est.cls)}>{est.label}</span>
          <span className="text-sm font-medium truncate">{bug.titulo}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{bug.autor_nombre ?? "—"} · {fechaCorta(bug.fecha_reporte)}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border/50 bg-surface/30 flex flex-col gap-3">
          {bug.descripcion && <p className="text-sm text-muted-foreground">{bug.descripcion}</p>}
          <div className="text-xs text-muted-foreground">
            Reportado {fechaCorta(bug.fecha_reporte)} por {bug.autor_nombre ?? "—"}
            {bug.fecha_resolucion && ` · Resuelto ${fechaCorta(bug.fecha_resolucion)}`}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Estado</Label>
            <NamedSelect
              className="w-full sm:w-56"
              options={Object.entries(ESTADOS).map(([v, e]) => ({ value: v, label: e.label }))}
              value={estado}
              onValueChange={(v) => setEstado(v ?? "nuevo")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Diagnóstico</Label>
            <textarea className="min-h-16 rounded-md border border-border bg-transparent px-3 py-2 text-sm" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} placeholder="Causa raíz…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Fix ejecutado</Label>
            <textarea className="min-h-16 rounded-md border border-border bg-transparent px-3 py-2 text-sm" value={fix} onChange={(e) => setFix(e.target.value)} placeholder="Qué se cambió…" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="ghost" onClick={borrar} disabled={busy} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Borrar
            </Button>
            <Button size="sm" onClick={guardar} disabled={busy}>
              <Check className="h-3.5 w-3.5 mr-1" /> {busy ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
