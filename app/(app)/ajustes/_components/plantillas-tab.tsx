"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { DeleteConfirm } from "@/components/shared/delete-confirm";
import { cn } from "@/lib/utils";
import {
  createPlantilla,
  updatePlantilla,
  deactivatePlantilla,
  deletePlantilla,
} from "@/lib/supabase/actions/plantillas";
import type { PlantillaRecurrente, Cuenta, Tarjeta, Categoria } from "@/types/supabase";

const METODOS = [
  "Efectivo", "Transferencia", "Billetera virtual",
  "Crédito", "Débito automático", "Débito",
] as const;

const CLASIFICACIONES = ["Fijo", "Variable", "Cuotas"] as const;

const schema = z.object({
  nombre:        z.string().min(1, "Requerido"),
  monto_estimado: z.number().nonnegative("Debe ser ≥ 0"),
  moneda:        z.enum(["ARS", "USD"]),
  dia_mes:       z.number().int().min(1, "Entre 1 y 31").max(31, "Entre 1 y 31"),
  metodo:        z.enum(METODOS).nullable().optional(),
  debita_de:     z.enum(["cuenta", "tarjeta"]).nullable().optional(),
  cuenta_id:     z.string().nullable().optional(),
  tarjeta_id:    z.string().nullable().optional(),
  clasificacion: z.enum(CLASIFICACIONES).nullable().optional(),
  concepto:      z.string().nullable().optional(),
  fecha_inicio:  z.string().optional(),
  notas:         z.string().nullable().optional(),
}).superRefine((d, ctx) => {
  if (d.debita_de === "cuenta" && !d.cuenta_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Seleccioná una cuenta", path: ["cuenta_id"] });
  }
  if (d.debita_de === "tarjeta" && !d.tarjeta_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Seleccioná una tarjeta", path: ["tarjeta_id"] });
  }
});

type FormData = z.infer<typeof schema>;

const EMPTY: FormData = {
  nombre: "", monto_estimado: 0, moneda: "ARS", dia_mes: 1,
  metodo: null, debita_de: null, cuenta_id: null, tarjeta_id: null,
  clasificacion: "Fijo", concepto: null, fecha_inicio: "", notas: null,
};

interface Props {
  plantillas: PlantillaRecurrente[];
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
}

function fmtMonto(n: number, moneda: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: moneda,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

export function PlantillasTab({ plantillas, cuentas, tarjetas, categorias }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [editing, setEditing]             = useState<PlantillaRecurrente | null>(null);
  const [toDelete, setToDelete]           = useState<PlantillaRecurrente | null>(null);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [actionError, setActionError]     = useState<string | null>(null);

  // Categoría/subcategoría — estado local fuera de RHF (igual que movimiento-editor)
  const [padreId, setPadreId] = useState<string | null>(null);
  const [subcatId, setSubcatId] = useState<string | null>(null);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  const debita_de = watch("debita_de");

  const catsPadre = categorias.filter(c => !c.parent_id && (c.tipo === "Egreso" || c.tipo === "Ambos"));
  const catsHijas = padreId ? categorias.filter(c => c.parent_id === padreId) : [];

  useEffect(() => { setSubcatId(null); }, [padreId]);

  function resolveCatId(catId: string | null | undefined) {
    if (!catId) { setPadreId(null); setSubcatId(null); return; }
    const cat = categorias.find(c => c.id === catId);
    if (cat?.parent_id) { setPadreId(cat.parent_id); setSubcatId(cat.id); }
    else { setPadreId(catId); setSubcatId(null); }
  }

  function openCreate() {
    setEditing(null);
    reset(EMPTY);
    setPadreId(null);
    setSubcatId(null);
    setActionError(null);
    setDialogOpen(true);
  }

  function openEdit(p: PlantillaRecurrente) {
    setEditing(p);
    resolveCatId(p.categoria_id);
    reset({
      nombre:         p.nombre,
      monto_estimado: p.monto_estimado,
      moneda:         p.moneda as "ARS" | "USD",
      dia_mes:        p.dia_mes,
      metodo:         p.metodo ?? null,
      debita_de:      p.debita_de ?? null,
      cuenta_id:      p.cuenta_id ?? null,
      tarjeta_id:     p.tarjeta_id ?? null,
      clasificacion:  p.clasificacion ?? null,
      concepto:       p.concepto ?? null,
      fecha_inicio:   p.fecha_inicio ?? "",
      notas:          p.notas ?? null,
    });
    setActionError(null);
    setDialogOpen(true);
  }

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const payload = {
        ...data,
        categoria_id: subcatId ?? padreId ?? null,
        fecha_inicio: data.fecha_inicio || new Date().toISOString().slice(0, 10),
      };
      if (editing) await updatePlantilla(editing.id, payload);
      else         await createPlantilla(payload);
      setDialogOpen(false);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onToggleActivo(p: PlantillaRecurrente) {
    try {
      await updatePlantilla(p.id, { activo: !p.activo });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  }

  async function onDelete() {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await deletePlantilla(toDelete.id);
      setDeleteOpen(false);
      router.refresh();
    } catch (e) {
      setDeleteOpen(false);
      alert(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {plantillas.length === 0
            ? "Todavía no tenés plantillas recurrentes."
            : `${plantillas.length} plantilla${plantillas.length !== 1 ? "s" : ""}`}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva plantilla
        </Button>
      </div>

      {plantillas.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {plantillas.map(p => {
            const cuenta  = cuentas.find(c => c.id === p.cuenta_id);
            const tarjeta = tarjetas.find(t => t.id === p.tarjeta_id);
            const instrumento = cuenta?.nombre ?? tarjeta?.nombre ?? null;
            return (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className={cn("text-sm font-medium", !p.activo && "text-muted-foreground line-through")}>
                    {p.nombre}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Día {p.dia_mes} · {fmtMonto(p.monto_estimado, p.moneda)}
                    {instrumento && ` · ${instrumento}`}
                    {!p.activo && " · inactiva"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon" variant="ghost"
                    title={p.activo ? "Desactivar" : "Activar"}
                    onClick={() => onToggleActivo(p)}
                    className={p.activo ? "text-muted-foreground" : "text-yellow-500"}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => { setToDelete(p); setDeleteOpen(true); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal crear/editar ───────────────────────────────────────────────── */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Editar plantilla" : "Nueva plantilla recurrente"}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
      >
        <div className="flex flex-col gap-3">

          <div className="space-y-1.5">
            <Label>Nombre <span className="text-muted-foreground text-xs">(identificador interno)</span></Label>
            <Input {...register("nombre")} placeholder="Ej. Luz Edenor" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monto estimado</Label>
              <Controller
                name="monto_estimado"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number" min={0} step="0.01"
                    value={field.value ?? ""}
                    onChange={e => field.onChange(e.target.valueAsNumber)}
                  />
                )}
              />
              {errors.monto_estimado && <p className="text-xs text-destructive">{errors.monto_estimado.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Controller
                name="moneda"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={[{ value: "ARS", label: "ARS" }, { value: "USD", label: "USD" }]}
                    value={field.value}
                    onValueChange={v => field.onChange(v ?? "ARS")}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Día del mes</Label>
            <Controller
              name="dia_mes"
              control={control}
              render={({ field }) => (
                <Input
                  type="number" min={1} max={31}
                  value={field.value ?? ""}
                  onChange={e => field.onChange(e.target.valueAsNumber)}
                  placeholder="1-31"
                />
              )}
            />
            {errors.dia_mes && <p className="text-xs text-destructive">{errors.dia_mes.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Método de pago</Label>
            <Controller
              name="metodo"
              control={control}
              render={({ field }) => (
                <NamedSelect
                  options={METODOS.map(m => ({ value: m, label: m }))}
                  value={field.value ?? null}
                  onValueChange={v => field.onChange(v)}
                  placeholder="Sin especificar"
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Se debita de</Label>
            <Controller
              name="debita_de"
              control={control}
              render={({ field }) => (
                <NamedSelect
                  options={[
                    { value: "cuenta", label: "Cuenta bancaria" },
                    { value: "tarjeta", label: "Tarjeta de crédito" },
                  ]}
                  value={field.value ?? null}
                  onValueChange={v => { field.onChange(v); }}
                  placeholder="Sin especificar"
                />
              )}
            />
          </div>

          {debita_de === "cuenta" && (
            <div className="space-y-1.5">
              <Label>Cuenta</Label>
              <Controller
                name="cuenta_id"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={cuentas.map(c => ({ value: c.id, label: c.nombre }))}
                    value={field.value ?? null}
                    onValueChange={v => field.onChange(v)}
                    placeholder="Seleccioná una cuenta"
                  />
                )}
              />
              {errors.cuenta_id && <p className="text-xs text-destructive">{errors.cuenta_id.message}</p>}
            </div>
          )}

          {debita_de === "tarjeta" && (
            <div className="space-y-1.5">
              <Label>Tarjeta</Label>
              <Controller
                name="tarjeta_id"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={tarjetas.map(t => ({ value: t.id, label: t.nombre }))}
                    value={field.value ?? null}
                    onValueChange={v => field.onChange(v)}
                    placeholder="Seleccioná una tarjeta"
                  />
                )}
              />
              {errors.tarjeta_id && <p className="text-xs text-destructive">{errors.tarjeta_id.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <NamedSelect
              options={catsPadre.map(c => ({ value: c.id, label: c.nombre }))}
              value={padreId}
              onValueChange={v => setPadreId(v)}
              placeholder="Sin categoría"
            />
          </div>

          {catsHijas.length > 0 && (
            <div className="space-y-1.5">
              <Label>Subcategoría</Label>
              <NamedSelect
                options={catsHijas.map(c => ({ value: c.id, label: c.nombre }))}
                value={subcatId}
                onValueChange={v => setSubcatId(v)}
                placeholder="Sin subcategoría"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Concepto <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input {...register("concepto")} placeholder="Ej. Servicio eléctrico" />
          </div>

          <div className="space-y-1.5">
            <Label>Clasificación</Label>
            <Controller
              name="clasificacion"
              control={control}
              render={({ field }) => (
                <NamedSelect
                  options={CLASIFICACIONES.map(c => ({ value: c, label: c }))}
                  value={field.value ?? null}
                  onValueChange={v => field.onChange(v)}
                  placeholder="Sin especificar"
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notas <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input {...register("notas")} placeholder="Ej. Vence si hay corte de luz" />
          </div>

          {actionError && (
            <p className="text-xs text-destructive">{actionError}</p>
          )}
        </div>
      </FormDialog>

      {/* ── Confirmar eliminación ────────────────────────────────────────────── */}
      <DeleteConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar plantilla?"
        description={`"${toDelete?.nombre}" se eliminará permanentemente. Si ya generó movimientos, esta acción fallará — desactivala en su lugar.`}
        onConfirm={onDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
