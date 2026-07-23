"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { DeleteConfirm } from "@/components/shared/delete-confirm";
import { createCuenta, updateCuenta, archiveCuenta } from "@/lib/supabase/actions/cuentas";
import type { InvSubtipo } from "@/lib/supabase/actions/cuentas";
import type { Cuenta } from "@/types/supabase";

// ─── Cuentas ────────────────────────────────────────────────────────────────

const TIPOS_CUENTA = ["Banco", "Billetera virtual", "Efectivo", "Inversión"] as const;
const MONEDAS = ["ARS", "USD"] as const;

const SUBTIPOS = [
  { value: "plazo_fijo",  label: "Plazo fijo" },
  { value: "cripto",      label: "Cripto" },
  { value: "fci",         label: "FCI (Fondo común)" },
  { value: "acciones",    label: "Acciones / CEDEARs" },
  { value: "usd_fisico",  label: "USD físico" },
  { value: "balanz",      label: "Cuenta Balanz" },
  { value: "otros",       label: "Otros" },
] as const;

const cuentaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  tipo: z.enum(TIPOS_CUENTA),
  moneda: z.enum(MONEDAS),
  saldo: z.number().min(0),
  inv_subtipo: z.string().nullable().optional(),
  inv_fecha_vencimiento: z.string().nullable().optional(),
  inv_notas: z.string().nullable().optional(),
  inv_tasa_anual: z.number().nullable().optional(),
});

type CuentaForm = z.infer<typeof cuentaSchema>;

function formatSaldo(saldo: number, moneda: string) {
  return `${moneda} ${new Intl.NumberFormat("es-AR").format(saldo)}`;
}

function CuentasSection({ cuentas }: { cuentas: Cuenta[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Cuenta | null>(null);
  const [toArchive, setToArchive] = useState<Cuenta | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } =
    useForm<CuentaForm>({ resolver: zodResolver(cuentaSchema) });

  const tipoWatched    = useWatch({ control, name: "tipo" });
  const subtipoWatched = useWatch({ control, name: "inv_subtipo" });
  const esInversion    = tipoWatched === "Inversión";
  const esPlazoFijo    = subtipoWatched === "plazo_fijo";

  function openCreate() {
    setEditing(null);
    reset({ nombre: "", tipo: "Banco", moneda: "ARS", saldo: 0,
      inv_subtipo: null, inv_fecha_vencimiento: null, inv_notas: null, inv_tasa_anual: null });
    setActionError(null);
    setDialogOpen(true);
  }

  function openEdit(cuenta: Cuenta) {
    setEditing(cuenta);
    reset({
      nombre: cuenta.nombre, tipo: cuenta.tipo,
      moneda: cuenta.moneda as "ARS" | "USD", saldo: cuenta.saldo,
      inv_subtipo: cuenta.inv_subtipo ?? null,
      inv_fecha_vencimiento: cuenta.inv_fecha_vencimiento ?? null,
      inv_notas: cuenta.inv_notas ?? null,
      inv_tasa_anual: cuenta.inv_tasa_anual ?? null,
    });
    setActionError(null);
    setDialogOpen(true);
  }

  async function onSubmit(data: CuentaForm) {
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (editing) {
        await updateCuenta(editing.id, {
          nombre: data.nombre, tipo: data.tipo, moneda: data.moneda, saldo: data.saldo,
          inv_subtipo: data.inv_subtipo as InvSubtipo | null | undefined,
          inv_fecha_vencimiento: data.inv_fecha_vencimiento,
          inv_notas: data.inv_notas, inv_tasa_anual: data.inv_tasa_anual,
        });
      } else {
        await createCuenta({
          nombre: data.nombre, tipo: data.tipo, moneda: data.moneda, saldo: data.saldo,
          inv_subtipo: data.inv_subtipo as InvSubtipo | null | undefined,
          inv_fecha_vencimiento: data.inv_fecha_vencimiento,
          inv_notas: data.inv_notas, inv_tasa_anual: data.inv_tasa_anual,
        });
      }
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
    try {
      await archiveCuenta(toArchive.id);
      setDeleteOpen(false);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al archivar");
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Cuentas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {cuentas.length === 0 ? "Todavía no tenés cuentas." : `${cuentas.length} cuenta${cuentas.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva cuenta
        </Button>
      </div>

      {cuentas.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {cuentas.map((cuenta) => (
            <div key={cuenta.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{cuenta.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {cuenta.tipo}
                  {cuenta.inv_subtipo && ` · ${SUBTIPOS.find(s => s.value === cuenta.inv_subtipo)?.label ?? cuenta.inv_subtipo}`}
                  {" · "}{formatSaldo(cuenta.saldo, cuenta.moneda)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon-sm" variant="ghost" onClick={() => openEdit(cuenta)} title="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm" variant="ghost" onClick={() => { setToArchive(cuenta); setActionError(null); setDeleteOpen(true); }}
                  title="Archivar" className="text-muted-foreground hover:text-destructive"
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Editar cuenta" : "Nueva cuenta"}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-nombre">Nombre</Label>
            <Input id="c-nombre" placeholder="Ej: Banco Nación" autoFocus {...register("nombre")} />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Controller name="tipo" control={control} render={({ field }) => (
              <NamedSelect
                options={TIPOS_CUENTA.map(t => ({ value: t, label: t }))}
                value={field.value}
                onValueChange={(v) => v && field.onChange(v)}
                placeholder="Seleccionar tipo..."
                className="w-full"
              />
            )} />
            {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>Moneda</Label>
              <Controller name="moneda" control={control} render={({ field }) => (
                <NamedSelect
                  options={[{ value: "ARS", label: "ARS" }, { value: "USD", label: "USD" }]}
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                  className="w-full"
                />
              )} />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="c-saldo">Saldo inicial</Label>
              <Input id="c-saldo" type="number" placeholder="0" {...register("saldo", { valueAsNumber: true })} />
              {editing && (
                <p className="text-xs text-muted-foreground">Editar el saldo inicial recalcula el balance actual.</p>
              )}
              {errors.saldo && <p className="text-xs text-destructive">{errors.saldo.message}</p>}
            </div>
          </div>

          {esInversion && (
            <div className="space-y-3 rounded-lg border border-border p-3 bg-surface/40">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Detalles de inversión</p>
              <div className="flex flex-col gap-1.5">
                <Label>Subtipo</Label>
                <Controller name="inv_subtipo" control={control} render={({ field }) => (
                  <NamedSelect
                    options={SUBTIPOS.map(s => ({ value: s.value, label: s.label }))}
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                    placeholder="Seleccioná el tipo de inversión…"
                    className="w-full"
                  />
                )} />
              </div>
              {esPlazoFijo && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-tasa">Tasa anual (%)</Label>
                    <Input id="c-tasa" type="number" min="0" step="0.01" placeholder="Ej. 118"
                      {...register("inv_tasa_anual", { valueAsNumber: true, setValueAs: v => v === "" ? null : Number(v) })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-vto">Fecha vencimiento</Label>
                    <Input id="c-vto" type="date" {...register("inv_fecha_vencimiento")} />
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="c-inv-notas">Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input id="c-inv-notas" placeholder="Ej. Cuenta en Balanz, broker XYZ…" {...register("inv_notas")} />
              </div>
            </div>
          )}

          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        </div>
      </FormDialog>

      <DeleteConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Archivar cuenta?"
        description={`"${toArchive?.nombre}" dejará de aparecer en la app. Podés desarchivarla desde Supabase si la necesitás.`}
        onConfirm={onArchive}
        isDeleting={isArchiving}
      />
    </div>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

interface Props {
  cuentas: Cuenta[];
}

export function CuentasConfigClient({ cuentas }: Props) {
  return (
    <div className="flex flex-col gap-10 pt-4 border-t border-border mt-4">
      <CuentasSection cuentas={cuentas} />
    </div>
  );
}
