"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Plane, PartyPopper, FolderKanban, Users2, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";
import { DeudasBilateralesSection } from "@/components/balances/deudas-bilaterales-section";
import { cn } from "@/lib/utils";
import { createProyecto } from "@/lib/supabase/actions/proyectos";
import type { ProyectoResumen } from "@/lib/supabase/actions/proyectos-types";
import type { DeudaCompartida, Persona } from "@/types/supabase";

const TIPOS = [
  { value: "viaje", label: "Viaje", icon: Plane },
  { value: "evento", label: "Evento", icon: PartyPopper },
  { value: "proyecto", label: "Proyecto", icon: FolderKanban },
  { value: "grupo", label: "Grupo", icon: Users2 },
] as const;

interface Props {
  proyectos: ProyectoResumen[];
  debo: DeudaCompartida[];
  meDeben: DeudaCompartida[];
  cuentas: { id: string; nombre: string }[];
  personasConectadas: Persona[];
}

export function HubClient({ proyectos, debo, meDeben, cuentas, personasConectadas }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<string>("viaje");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openForm() {
    setNombre("");
    setTipo("viaje");
    setSeleccionados(new Set());
    setError(null);
    setShowForm(true);
  }

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { setError("Poné un nombre"); return; }
    setSaving(true);
    setError(null);
    try {
      const miembros = personasConectadas
        .filter((p) => seleccionados.has(p.id))
        .map((p) => ({ usuarioId: p.usuario_vinculado_id, nombre: p.nombre }));
      const res = await createProyecto({ nombre: nombre.trim(), tipo, miembros });
      if ("error" in res) { setError(res.error); return; }
      setShowForm(false);
      router.push(`/proyectos/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Compartido</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gastos y proyectos compartidos con otros.
          </p>
        </div>
        <Button size="sm" onClick={openForm}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo proyecto
        </Button>
      </div>

      <Tabs defaultValue="proyectos">
        <TabsList>
          <TabsTrigger value="proyectos">Proyectos</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="proyectos" className="pt-4">
          {proyectos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
              Todavía no tenés proyectos. Creá un viaje, evento o grupo para dividir gastos.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {proyectos.map((p) => {
                const t = TIPOS.find((x) => x.value === p.proyecto.tipo) ?? TIPOS[3];
                const Icon = t.icon;
                return (
                  <Link
                    key={p.proyecto.id}
                    href={`/proyectos/${p.proyecto.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.proyecto.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.miembros.length} miembro{p.miembros.length !== 1 ? "s" : ""} · {p.cantGastos} gasto{p.cantGastos !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="todos" className="pt-4">
          <DeudasBilateralesSection debo={debo} meDeben={meDeben} cuentas={cuentas} />
          {debo.length === 0 && meDeben.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
              No tenés deudas compartidas activas con usuarios de Perchapp.
            </p>
          )}
          <div className="mt-4">
            <Link href="/balances" className="text-sm text-primary hover:underline">
              Ver todos los balances →
            </Link>
          </div>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={showForm}
        onOpenChange={setShowForm}
        title="Nuevo proyecto"
        description="Un viaje, evento o grupo para dividir gastos entre varios."
        onSubmit={handleCrear}
        isSubmitting={saving}
        submitLabel="Crear"
      >
        <div className="flex flex-col gap-1.5">
          <Label>Nombre</Label>
          <Input autoFocus placeholder="Ej. Viaje a Bariloche" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Tipo</Label>
          <div className="grid grid-cols-4 gap-2">
            {TIPOS.map((t) => {
              const Icon = t.icon;
              const active = tipo === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-colors",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-surface",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Miembros (usuarios conectados)</Label>
          {personasConectadas.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No tenés conexiones todavía. Podés crear el proyecto y sumar miembros después.
            </p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {personasConectadas.map((p) => {
                const checked = seleccionados.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className="flex items-center gap-3 w-full px-3 py-2 border-b border-border last:border-b-0 text-sm hover:bg-surface/60 text-left"
                  >
                    <span className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border shrink-0",
                      checked ? "bg-primary border-primary text-primary-foreground" : "border-border",
                    )}>
                      {checked && "✓"}
                    </span>
                    {p.nombre}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </FormDialog>
    </div>
  );
}
