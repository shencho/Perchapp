"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { DeleteConfirm } from "@/components/shared/delete-confirm";
import {
  createTarjeta,
  updateTarjeta,
  archiveTarjeta,
} from "@/lib/supabase/actions/tarjetas";
import type { Tarjeta, Cuenta } from "@/types/supabase";

const TIPOS = ["Crédito", "Débito"] as const;

const schema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  tipo: z.enum(TIPOS),
  banco_emisor: z.string().optional(),
  ultimos_cuatro: z
    .string()
    .regex(/^\d{4}$/, "Deben ser 4 dígitos numéricos")
    .optional()
    .or(z.literal("")),
  cierre_dia: z.number().int().min(1).max(31).nullable().optional(),
  vencimiento_dia: z.number().int().min(1).max(31).nullable().optional(),
  limite_ars: z.number().positive().nullable().optional(),
  limite_usd: z.number().positive().nullable().optional(),
  cuenta_pago_default: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  tarjetas: Tarjeta[];
  cuentas: Cuenta[];
}

const EMPTY: FormData = {
  nombre: "",
  tipo: "Crédito",
  banco_emisor: "",
  ultimos_cuatro: "",
  cierre_dia: null,
  vencimiento_dia: null,
  limite_ars: null,
  limite_usd: null,
  cuenta_pago_default: null,
};

export function TarjetasTab({ tarjetas, cuentas }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Tarjeta | null>(null);
  const [toArchive, setToArchive] = useState<Tarjeta | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function openCreate() {
    setEditing(null);
    reset(EMPTY);
    setActionError(null);
    setDialogOpen(true);
  }

  function openEdit(tarjeta: Tarjeta) {
    setEditing(tarjeta);
    reset({
      nombre: tarjeta.nombre,
      tipo: tarjeta.tipo ?? "Crédito",
      banco_emisor: tarjeta.banco_emisor ?? "",
      ultimos_cuatro: tarjeta.ultimos_cuatro ?? "",
      cierre_dia: tarjeta.cierre_dia ?? null,
      vencimiento_dia: tarjeta.vencimiento_dia ?? null,
      limite_ars: tarjeta.limite_ars ?? null,
      limite_usd: tarjeta.limite_usd ?? null,
      cuenta_pago_default: tarjeta.cuenta_pago_default ?? null,
    });
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
        banco_emisor: data.banco_emisor || null,
        ultimos_cuatro: data.ultimos_cuatro || null,
        cierre_dia: data.cierre_dia || null,
        vencimiento_dia: data.vencimiento_dia || null,
        limite_ars: data.limite_ars || null,
        limite_usd: data.limite_usd || null,
        cuenta_pago_default: data.cuenta_pago_default || null,
      };
      if (editing) await updateTarjeta(editing.id, payload);
      else await createTarjeta(payload);
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
      await archiveTarjeta(toArchive.id);
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tarjetas.length === 0
            ? "Todavía no tenés tarjetas."
            : `${tarjetas.length} tarjeta${tarjetas.length !== 1 ? "s" : ""}`}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva tarjeta
        </Button>
      </div>

      {tarjetas.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {tarjetas.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {t.nombre}
                  {t.ultimos_cuatro && (
                    <span className="text-muted-foreground font-normal">
                      {" "}···· {t.ultimos_cuatro}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.tipo ?? "—"}
                  {t.banco_emisor ? ` · ${t.banco_emisor}` : ""}
                  {t.cierre_dia ? ` · Cierre día ${t.cierre_dia}` : ""}
                  {t.vencimiento_dia ? ` · Vto. día ${t.vencimiento_dia}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => openEdit(t)}
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => { setToArchive(t); setDeleteOpen(true); }}
                  title="Archivar"
                  className="text-muted-foreground hover:text-destructive"
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
        title={editing ? "Editar tarjeta" : "Nueva tarjeta"}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
      >
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-nombre">Nombre</Label>
            <Input
              id="t-nombre"
              placeholder="Ej: VISA Banco Ciudad"
              autoFocus
              {...register("nombre")}
            />
            {errors.nombre && (
              <p className="text-xs text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>Tipo</Label>
              <Controller
                name="tipo"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="banco_emisor">Banco emisor</Label>
              <Input
                id="banco_emisor"
                placeholder="Ej: Galicia"
                {...register("banco_emisor")}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="ultimos_cuatro">Últimos 4 dígitos</Label>
              <Input
                id="ultimos_cuatro"
                placeholder="1234"
                maxLength={4}
                {...register("ultimos_cuatro")}
              />
              {errors.ultimos_cuatro && (
                <p className="text-xs text-destructive">
                  {errors.ultimos_cuatro.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="cierre_dia">Día cierre</Label>
              <Input
                id="cierre_dia"
                type="number"
                min={1}
                max={31}
                placeholder="20"
                {...register("cierre_dia", { setValueAs: (v) => v === "" || v === null ? null : parseInt(v) || null })}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="vencimiento_dia">Día vto.</Label>
              <Input
                id="vencimiento_dia"
                type="number"
                min={1}
                max={31}
                placeholder="10"
                {...register("vencimiento_dia", { setValueAs: (v) => v === "" || v === null ? null : parseInt(v) || null })}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="limite_ars">Límite ARS</Label>
              <Input
                id="limite_ars"
                type="number"
                placeholder="500000"
                {...register("limite_ars", { setValueAs: (v) => v === "" || v === null ? null : parseFloat(v) || null })}
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="limite_usd">Límite USD (opcional)</Label>
              <Input
                id="limite_usd"
                type="number"
                placeholder="1000"
                {...register("limite_usd", { setValueAs: (v) => v === "" || v === null ? null : parseFloat(v) || null })}
              />
            </div>
          </div>

          {cuentas.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Cuenta de pago default</Label>
              <Controller
                name="cuenta_pago_default"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sin cuenta asignada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin cuenta asignada</SelectItem>
                      {cuentas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre} ({c.moneda})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {actionError && (
            <p className="text-sm text-destructive">{actionError}</p>
          )}
        </div>
      </FormDialog>

      <DeleteConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Archivar tarjeta?"
        description={`"${toArchive?.nombre}" dejará de aparecer en la app.`}
        onConfirm={onArchive}
        isDeleting={isArchiving}
      />
    </div>
  );
}
