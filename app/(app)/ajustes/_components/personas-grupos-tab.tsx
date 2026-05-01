"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Users, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteConfirm } from "@/components/shared/delete-confirm";
import { cn } from "@/lib/utils";
import {
  createPersona,
  updatePersona,
  deletePersona,
} from "@/lib/supabase/actions/personas";
import {
  createGrupo,
  updateGrupo,
  deleteGrupo,
} from "@/lib/supabase/actions/grupos";
import type { Persona } from "@/types/supabase";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos";

interface Props {
  personas: Persona[];
  grupos: GrupoConMiembros[];
}

export function PersonasGruposTab({ personas, grupos }: Props) {
  return (
    <div className="flex flex-col gap-10">
      <PersonasSection personas={personas} />
      <GruposSection grupos={grupos} personas={personas} />
    </div>
  );
}

// ── Personas ──────────────────────────────────────────────────────────────────

function PersonasSection({ personas }: { personas: Persona[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Persona | null>(null);
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Persona | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setNombre("");
    setNotas("");
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: Persona) {
    setEditing(p);
    setNombre(p.nombre);
    setNotas(p.notas ?? "");
    setError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    setError(null);
  }

  async function handleSave() {
    if (!nombre.trim()) { setError("El nombre es requerido"); return; }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updatePersona(editing.id, { nombre: nombre.trim(), notas: notas.trim() || null });
      } else {
        await createPersona(nombre.trim(), notas.trim() || null);
      }
      setShowForm(false);
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePersona(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Personas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Agenda personal para gastos compartidos — no se vincula con clientes.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {/* Form inline */}
      {showForm && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg px-4 py-3 flex flex-col gap-3">
          <p className="text-sm font-medium">{editing ? "Editar persona" : "Nueva persona"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input
                autoFocus
                placeholder="Ej: Martín, mamá, Sofi..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") cancelForm(); }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notas <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Input
                placeholder="Teléfono, CBU, lo que quieras"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") cancelForm(); }}
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelForm} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {personas.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
          Todavía no tenés personas guardadas.
        </p>
      ) : personas.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {personas.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium">{p.nombre}</span>
                {p.notas && (
                  <span className="text-xs text-muted-foreground truncate">{p.notas}</span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="icon-sm" variant="ghost" onClick={() => openEdit(p)} title="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget(p)}
                  title="Eliminar"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteConfirm
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="¿Eliminar persona?"
        description={`"${deleteTarget?.nombre}" se quitará de tu agenda. Los gastos donde ya participó no se verán afectados.`}
        onConfirm={handleDelete}
        isDeleting={deleting}
      />
    </div>
  );
}

// ── Grupos ────────────────────────────────────────────────────────────────────

function GruposSection({
  grupos,
  personas,
}: {
  grupos: GrupoConMiembros[];
  personas: Persona[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GrupoConMiembros | null>(null);
  const [nombre, setNombre] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GrupoConMiembros | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setNombre("");
    setSeleccionados(new Set());
    setError(null);
    setShowForm(true);
  }

  function openEdit(g: GrupoConMiembros) {
    setEditing(g);
    setNombre(g.nombre);
    setSeleccionados(new Set(g.miembros.map((m) => m.id)));
    setError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    setError(null);
  }

  function toggleMiembro(id: string) {
    const s = new Set(seleccionados);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSeleccionados(s);
  }

  async function handleSave() {
    if (!nombre.trim()) { setError("El nombre es requerido"); return; }
    setSaving(true);
    setError(null);
    try {
      const ids = Array.from(seleccionados);
      if (editing) {
        await updateGrupo(editing.id, nombre.trim(), ids);
      } else {
        await createGrupo(nombre.trim(), ids);
      }
      setShowForm(false);
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGrupo(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Grupos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Conjuntos de personas para cargar gastos compartidos de un tirón.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} disabled={personas.length === 0}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo grupo
        </Button>
      </div>

      {personas.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Primero agregá personas arriba para poder crear grupos.
        </p>
      )}

      {/* Form inline */}
      {showForm && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg px-4 py-3 flex flex-col gap-4">
          <p className="text-sm font-medium">{editing ? "Editar grupo" : "Nuevo grupo"}</p>

          <div className="flex flex-col gap-1.5">
            <Label>Nombre del grupo <span className="text-destructive">*</span></Label>
            <Input
              autoFocus
              placeholder="Ej: Hermanos, Amigos del fútbol, Viaje a Bariloche…"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelForm(); }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Miembros</Label>
            {personas.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay personas en tu agenda aún.</p>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                {personas.map((p) => {
                  const checked = seleccionados.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleMiembro(p.id)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 border-b border-border last:border-b-0 text-sm hover:bg-surface/60 transition-colors text-left"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border flex-shrink-0",
                          checked
                            ? "bg-primary border-primary"
                            : "border-border bg-transparent",
                        )}
                      >
                        {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                      </span>
                      <span className={checked ? "text-foreground" : "text-muted-foreground"}>
                        {p.nombre}
                      </span>
                      {p.notas && (
                        <span className="text-xs text-muted-foreground/60 truncate">{p.notas}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {seleccionados.size === 0
                ? "Ningún miembro seleccionado"
                : `${seleccionados.size} miembro${seleccionados.size !== 1 ? "s" : ""} seleccionado${seleccionados.size !== 1 ? "s" : ""}`}
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelForm} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de grupos */}
      {grupos.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
          Todavía no tenés grupos.
        </p>
      ) : grupos.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {grupos.map((g) => (
            <div key={g.id} className="flex items-start justify-between px-4 py-3 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium">{g.nombre}</span>
                </div>
                {g.miembros.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {g.miembros.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface text-xs text-muted-foreground border border-border"
                      >
                        {m.nombre}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin miembros</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                <Button size="icon-sm" variant="ghost" onClick={() => openEdit(g)} title="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget(g)}
                  title="Eliminar"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteConfirm
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="¿Eliminar grupo?"
        description={`"${deleteTarget?.nombre}" se eliminará. Las personas del grupo no se ven afectadas.`}
        onConfirm={handleDelete}
        isDeleting={deleting}
      />
    </div>
  );
}
