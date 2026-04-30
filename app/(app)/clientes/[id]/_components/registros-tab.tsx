"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { DeleteConfirm } from "@/components/shared/delete-confirm";
import {
  getRegistros,
  createRegistro,
  updateRegistro,
  eliminarRegistro,
  calcularTarifaParaRegistro,
} from "@/lib/supabase/actions/registros";
import type { ClienteConSaldo } from "@/lib/supabase/actions/clientes";
import type { ServicioConHistorial } from "@/lib/supabase/actions/servicios";
import type { RegistroConServicio } from "@/lib/supabase/actions/registros";
import { cn } from "@/lib/utils";

const TIPOS = ["sesion", "hora", "hito", "comision"] as const;
const TIPO_LABEL: Record<string, string> = { sesion: "Sesión", hora: "Hora", hito: "Hito", comision: "Comisión" };

const TIPO_BADGE_CLASS: Record<string, string> = {
  sesion:   "bg-surface border-border text-foreground",
  hora:     "bg-surface border-border text-foreground",
  hito:     "bg-surface border-border text-foreground",
  comision: "bg-violet-900/30 text-violet-300 border-violet-800",
};

const schema = z.object({
  servicio_id:    z.string().min(1, "Seleccioná un servicio"),
  tipo:           z.enum(TIPOS),
  fecha:          z.string().min(1),
  cantidad:       z.number().positive(),
  monto_override: z.boolean(),
  monto_manual:   z.number().positive().nullable().optional(),
  notas:          z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function mesAnioActual() {
  const d = new Date();
  return { mes: d.getMonth() + 1, anio: d.getFullYear() };
}

function formatMes(mes: number, anio: number) {
  return new Date(anio, mes - 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function formatMonto(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

interface Props {
  cliente: ClienteConSaldo;
  servicios: ServicioConHistorial[];
}

export function RegistrosTab({ cliente, servicios }: Props) {
  const router = useRouter();
  const { mes: mesActual, anio: anioActual } = mesAnioActual();
  const [mes, setMes] = useState(mesActual);
  const [anio, setAnio] = useState(anioActual);
  const [registros, setRegistros] = useState<RegistroConServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<RegistroConServicio | null>(null);
  const [toDelete, setToDelete] = useState<RegistroConServicio | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [montoCalculado, setMontoCalculado] = useState<number | null>(null);
  const [calculando, setCalculando] = useState(false);

  const serviciosActivos = servicios.filter((s) => !s.archivado);

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      servicio_id:    "",
      tipo:           "sesion",
      fecha:          todayStr(),
      cantidad:       1,
      monto_override: false,
      monto_manual:   null,
      notas:          null,
    },
  });

  const servicioId    = watch("servicio_id");
  const fecha         = watch("fecha");
  const cantidad      = watch("cantidad");
  const montoOverride = watch("monto_override");

  const servicioSeleccionado = serviciosActivos.find((s) => s.id === servicioId);
  const esComision = servicioSeleccionado?.modalidad === "comision";

  // Auto-set tipo=comision cuando el servicio es de tipo comisión
  useEffect(() => {
    if (esComision) setValue("tipo", "comision");
  }, [esComision, setValue]);

  // Recalcular monto cuando cambian servicio/fecha/cantidad (no aplica para comisión)
  useEffect(() => {
    if (!servicioId || !fecha || !cantidad || esComision) { setMontoCalculado(null); return; }
    let cancelled = false;
    setCalculando(true);
    calcularTarifaParaRegistro(servicioId, cliente.id, fecha, cantidad)
      .then((r) => { if (!cancelled) setMontoCalculado(r.monto); })
      .catch(() => { if (!cancelled) setMontoCalculado(null); })
      .finally(() => { if (!cancelled) setCalculando(false); });
    return () => { cancelled = true; };
  }, [servicioId, fecha, cantidad, cliente.id, esComision]);

  // Cargar registros del mes
  useEffect(() => {
    setLoading(true);
    getRegistros(cliente.id, mes, anio)
      .then(setRegistros)
      .catch(() => setRegistros([]))
      .finally(() => setLoading(false));
  }, [cliente.id, mes, anio]);

  function openCreate() {
    setEditing(null);
    setMontoCalculado(null);
    setWarning(null);
    reset({
      servicio_id:    serviciosActivos[0]?.id ?? "",
      tipo:           "sesion",
      fecha:          todayStr(),
      cantidad:       1,
      monto_override: false,
      monto_manual:   null,
      notas:          null,
    });
    setActionError(null);
    setDialogOpen(true);
  }

  function openEdit(r: RegistroConServicio) {
    setEditing(r);
    setMontoCalculado(r.monto);
    setWarning(null);
    reset({
      servicio_id:    r.servicio_id ?? "",
      tipo:           (r.tipo as typeof TIPOS[number]) ?? "sesion",
      fecha:          r.fecha,
      cantidad:       r.cantidad,
      monto_override: r.monto_override,
      monto_manual:   r.monto_override ? r.monto : null,
      notas:          r.notas ?? null,
    });
    setActionError(null);
    setDialogOpen(true);
  }

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setActionError(null);
    try {
      let result: { warning?: string };
      if (editing) {
        result = await updateRegistro(editing.id, {
          tipo:           data.tipo,
          fecha:          data.fecha,
          cantidad:       data.cantidad,
          monto_override: data.monto_override,
          monto:          data.monto_override ? (data.monto_manual ?? montoCalculado) : montoCalculado,
          notas:          data.notas ?? null,
        });
      } else {
        result = await createRegistro({
          cliente_id:     cliente.id,
          servicio_id:    data.servicio_id,
          tipo:           data.tipo,
          fecha:          data.fecha,
          cantidad:       data.cantidad,
          monto_override: esComision ? true : data.monto_override,
          monto_manual:   esComision ? (data.monto_manual ?? null) : (data.monto_override ? data.monto_manual : null),
          notas:          data.notas ?? null,
        });
      }
      setDialogOpen(false);
      if (result.warning) setWarning(result.warning);
      // Recargar lista
      const nuevos = await getRegistros(cliente.id, mes, anio);
      setRegistros(nuevos);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete() {
    if (!toDelete) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await eliminarRegistro(toDelete.id);
      setDeleteOpen(false);
      const nuevos = await getRegistros(cliente.id, mes, anio);
      setRegistros(nuevos);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al eliminar");
      setDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  const aniosDisponibles = [anioActual, anioActual - 1, anioActual - 2];

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros de período */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <NamedSelect
            options={MESES.map((m) => ({
              value: String(m),
              label: new Date(2024, m - 1).toLocaleDateString("es-AR", { month: "long" }),
            }))}
            value={String(mes)}
            onValueChange={(v) => v && setMes(Number(v))}
            className="w-36 h-8 text-sm"
          />
          <NamedSelect
            options={aniosDisponibles.map((a) => ({ value: String(a), label: String(a) }))}
            value={String(anio)}
            onValueChange={(v) => v && setAnio(Number(v))}
            className="w-24 h-8 text-sm"
          />
        </div>
        <Button size="sm" onClick={openCreate} disabled={serviciosActivos.length === 0}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo registro
        </Button>
      </div>

      {serviciosActivos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Este cliente no tiene servicios activos. Creá uno en el tab Servicios.
        </p>
      )}

      {warning && (
        <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-800/40 rounded-lg px-4 py-2 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Cargando…</p>
      ) : registros.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          Sin registros en {formatMes(mes, anio)}.
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Desktop */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Servicio</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Cantidad</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {registros.map((r) => (
                  <tr key={r.id} className="hover:bg-surface/30">
                    <td className="px-4 py-2.5 text-muted-foreground">{r.fecha}</td>
                    <td className="px-4 py-2.5">{r.servicio_nombre ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        TIPO_BADGE_CLASS[r.tipo ?? "sesion"] ?? TIPO_BADGE_CLASS.sesion
                      )}>
                        {TIPO_LABEL[r.tipo ?? "sesion"] ?? r.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">{r.cantidad}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatMonto(r.monto)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        r.pago_id
                          ? "bg-green-900/30 text-green-300 border-green-800"
                          : "bg-amber-900/30 text-amber-300 border-amber-800"
                      )}>
                        {r.pago_id ? "Cobrado" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => openEdit(r)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => { setToDelete(r); setDeleteOpen(true); }}
                          title="Eliminar"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="flex flex-col divide-y divide-border sm:hidden">
            {registros.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 flex-1">
                  <span className="text-sm font-medium">{r.servicio_nombre ?? "—"}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{r.fecha}</span>
                    <span>·</span>
                    <span>{TIPO_LABEL[r.tipo ?? "sesion"]}</span>
                    <span>·</span>
                    <span>{r.cantidad} u.</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-medium text-sm">{formatMonto(r.monto)}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full border",
                    r.pago_id
                      ? "bg-green-900/30 text-green-300 border-green-800"
                      : "bg-amber-900/30 text-amber-300 border-amber-800"
                  )}>
                    {r.pago_id ? "Cobrado" : "Pendiente"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon-sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => { setToDelete(r); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totales del período */}
      {registros.length > 0 && (
        <div className="flex justify-between text-sm px-1">
          <span className="text-muted-foreground">
            Total {formatMes(mes, anio)}: {registros.length} registro{registros.length !== 1 ? "s" : ""}
          </span>
          <span className="font-medium">
            {formatMonto(registros.reduce((acc, r) => acc + (r.monto ?? 0), 0))}
          </span>
        </div>
      )}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {/* Editor modal */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Editar registro" : "Nuevo registro"}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
      >
        <div className="flex flex-col gap-4">
          {/* Servicio */}
          {!editing && (
            <div className="flex flex-col gap-1.5">
              <Label>Servicio</Label>
              <Controller
                name="servicio_id"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={serviciosActivos.map((s) => ({ value: s.id, label: s.nombre }))}
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v)}
                    placeholder="Seleccionar servicio…"
                    className="w-full"
                  />
                )}
              />
              {errors.servicio_id && <p className="text-xs text-destructive">{errors.servicio_id.message}</p>}
            </div>
          )}

          {/* Tipo + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Controller
                name="tipo"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={TIPOS.map((t) => ({ value: t, label: TIPO_LABEL[t] }))}
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v)}
                    disabled={esComision}
                    className="w-full"
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-fecha">Fecha</Label>
              <Input id="reg-fecha" type="date" {...register("fecha")} />
            </div>
          </div>

          {/* Cantidad */}
          <div className="flex flex-col gap-1.5 w-32">
            <Label htmlFor="reg-cantidad">Cantidad</Label>
            <Input
              id="reg-cantidad"
              type="number"
              min="0.5"
              step="0.5"
              {...register("cantidad", { valueAsNumber: true })}
            />
          </div>

          {/* Monto: directo para comisión, auto-calculado para el resto */}
          {esComision ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-monto-comision">Monto de la comisión</Label>
              <Input
                id="reg-monto-comision"
                type="number"
                step="0.01"
                placeholder="0"
                {...register("monto_manual", { valueAsNumber: true })}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2 bg-surface/50 rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Monto calculado</Label>
                <span className="text-sm font-medium">
                  {calculando ? "Calculando…" : montoCalculado != null ? formatMonto(montoCalculado) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reg-override"
                  {...register("monto_override")}
                  className="rounded border-border"
                />
                <label htmlFor="reg-override" className="text-xs text-muted-foreground cursor-pointer">
                  Modificar monto manualmente
                </label>
              </div>
              {montoOverride && (
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Monto manual"
                  {...register("monto_manual", { valueAsNumber: true })}
                />
              )}
            </div>
          )}

          {/* Notas */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-notas">Notas</Label>
            <Input id="reg-notas" placeholder="Opcional" {...register("notas")} />
          </div>

          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        </div>
      </FormDialog>

      <DeleteConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar registro?"
        description={`Este registro de ${toDelete?.fecha} será eliminado permanentemente.`}
        onConfirm={onDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
