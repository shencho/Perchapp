"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { NamedSelect } from "@/components/ui/named-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { DeleteConfirm } from "@/components/shared/delete-confirm";
import {
  createCategoria,
  updateCategoria,
  archiveCategoria,
} from "@/lib/supabase/actions/categorias";
import { ImportarTemplateModal } from "./importar-template-modal";
import type { Categoria } from "@/types/supabase";

const TIPOS = ["Ingreso", "Egreso", "Ambos"] as const;

const TIPO_COLORS: Record<string, string> = {
  Ingreso: "text-green-500",
  Egreso:  "text-red-400",
  Ambos:   "text-blue-400",
};

const schema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  tipo: z.enum(TIPOS),
  parent_id: z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  categorias: Categoria[];
}

export function CategoriasTab({ categorias }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [toArchive, setToArchive] = useState<Categoria | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Solo categorías raíz (sin parent) para el selector de padre
  const padres = categorias.filter((c) => !c.parent_id);

  // Lista jerárquica: padres con sus hijos
  const ordenadas: Categoria[] = [];
  padres.forEach((padre) => {
    ordenadas.push(padre);
    categorias
      .filter((c) => c.parent_id === padre.id)
      .forEach((hijo) => ordenadas.push(hijo));
  });
  // Categorías con parent_id que no encontraron su padre (huérfanas)
  categorias
    .filter(
      (c) => c.parent_id && !categorias.find((p) => p.id === c.parent_id)
    )
    .forEach((c) => ordenadas.push(c));

  function openCreate() {
    setEditing(null);
    reset({ nombre: "", tipo: "Egreso", parent_id: null });
    setActionError(null);
    setDialogOpen(true);
  }

  function openEdit(cat: Categoria) {
    setEditing(cat);
    reset({ nombre: cat.nombre, tipo: cat.tipo, parent_id: cat.parent_id });
    setActionError(null);
    setDialogOpen(true);
  }

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const payload = {
        nombre: data.nombre,
        tipo: data.tipo,
        parent_id: data.parent_id || null,
      };
      if (editing) await updateCategoria(editing.id, payload);
      else await createCategoria(payload);
      setDialogOpen(false);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onArchive() {
    if (!toArchive) return;
    setIsArchiving(true);
    setActionError(null);
    try {
      await archiveCategoria(toArchive.id);
      setDeleteOpen(false);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al archivar");
      setDeleteOpen(false);
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {categorias.length === 0
            ? "Todavía no tenés categorías."
            : `${categorias.length} categoría${categorias.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportModalOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1" />
            Importar sugeridas
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva categoría
          </Button>
        </div>
      </div>

      {ordenadas.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {ordenadas.map((cat) => {
            const esHijo = !!cat.parent_id;
            return (
              <div
                key={cat.id}
                className={`flex items-center justify-between px-4 py-3 ${esHijo ? "bg-muted/30" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {esHijo && (
                    <span className="w-4 text-muted-foreground text-xs">↳</span>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{cat.nombre}</span>
                    <span className={`text-xs ${TIPO_COLORS[cat.tipo] ?? "text-muted-foreground"}`}>
                      {cat.tipo}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openEdit(cat)}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => { setToArchive(cat); setActionError(null); setDeleteOpen(true); }}
                    title="Archivar"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Editar categoría" : "Nueva categoría"}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-nombre">Nombre</Label>
            <Input
              id="cat-nombre"
              placeholder="Ej: Servicios profesionales"
              autoFocus
              {...register("nombre")}
            />
            {errors.nombre && (
              <p className="text-xs text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <NamedSelect
                  options={TIPOS.map(t => ({ value: t, label: t }))}
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                  className="w-full"
                />
              )}
            />
          </div>

          {padres.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Categoría padre (opcional)</Label>
              <Controller
                name="parent_id"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={[
                      { value: "", label: "Sin categoría padre (es raíz)" },
                      ...padres
                        .filter(p => p.id !== editing?.id)
                        .map(p => ({ value: p.id, label: p.nombre })),
                    ]}
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v)}
                    placeholder="Sin categoría padre (es raíz)"
                    className="w-full"
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Las subcategorías aparecen indentadas bajo su padre.
              </p>
            </div>
          )}

          {actionError && (
            <p className="text-sm text-destructive">{actionError}</p>
          )}
        </div>
      </FormDialog>

      <ImportarTemplateModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        categorias={categorias}
        onDone={() => router.refresh()}
      />

      <DeleteConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Archivar categoría?"
        description={`"${toArchive?.nombre}" dejará de aparecer en la app. Si tiene subcategorías activas, primero archivalas.`}
        onConfirm={onArchive}
        isDeleting={isArchiving}
      />
    </div>
  );
}
