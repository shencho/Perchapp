"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { DeleteConfirm } from "@/components/shared/delete-confirm";
import {
  createServicio,
  updateServicio,
  archivarServicio,
  getTarifasHistorial,
} from "@/lib/supabase/actions/servicios";
import type { ClienteConSaldo } from "@/lib/supabase/actions/clientes";
import type { ServicioConHistorial } from "@/lib/supabase/actions/servicios";
import type { TarifaHistorial } from "@/types/supabase";
import { cn } from "@/lib/utils";

const MODALIDADES = ["sesion", "hora", "abono", "proyecto", "comision"] as const;
const CICLOS      = ["mensual", "quincenal", "al_cierre", "por_hito", "inmediato"] as const;
const MONEDAS     = ["ARS", "USD"] as const;
const ESTADOS_PROYECTO = ["activo", "finalizado", "pausado"] as const;

const MODALIDAD_LABEL: Record<string, string> = {
  sesion:   "Por sesión",
  hora:     "Por hora",
  abono:    "Abono",
  proyecto: "Proyecto",
  comision: "Comisión variable",
};

const CICLO_LABEL: Record<string, string> = {
  mensual:   "Mensual",
  quincenal: "Quincenal",
  al_cierre: "Al cierre",
  por_hito:  "Por hito",
  inmediato: "Inmediato",
};

const schema = z.object({
  nombre:                z.string().min(1, "El nombre es requerido"),
  modalidad:             z.enum(MODALIDADES),
  tarifa_actual:         z.number().positive().nullable().optional(),
  tarifa_moneda:         z.enum(MONEDAS),
  ciclo_facturacion:     z.enum(CICLOS),
  dia_cierre_ciclo:      z.number().int().min(1).max(31).nullable().optional(),
  tope_unidades_periodo: z.number().int().positive().nullable().optional(),
  tarifa_unidad_extra:   z.number().positive().nullable().optional(),
  proyecto_total:        z.number().positive().nullable().optional(),
  proyecto_estado:       z.enum(ESTADOS_PROYECTO),
  notas:                 z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

const EMPTY: FormData = {
  nombre:                "",
  modalidad:             "sesion",
  tarifa_actual:         null,
  tarifa_moneda:         "ARS",
  ciclo_facturacion:     "mensual",
  dia_cierre_ciclo:      null,
  tope_unidades_periodo: null,
  tarifa_unidad_extra:   null,
  proyecto_total:        null,
  proyecto_estado:       "activo",
  notas:                 null,
};

interface Props {
  cliente: ClienteConSaldo;
  serviciosIniciales: ServicioConHistorial[];
}

export function ServiciosTab({ cliente, serviciosIniciales }: Props) {
  const router = useRouter();
  const [servicios, setServicios] = useState(serviciosIniciales);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editing, setEditing] = useState<ServicioConHistorial | null>(null);
  const [toArchive, setToArchive] = useState<ServicioConHistorial | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState<Record<string, boolean>>({});
  const [historialData, setHistorialData] = useState<Record<string, TarifaHistorial[]>>({});
  const [historialLoading, setHistorialLoading] = useState<Record<string, boolean>>({});

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const modalidad = watch("modalidad");
  const tieneTope = watch("tope_unidades_periodo");

  function openCreate() {
    setEditing(null);
    reset(EMPTY);
    setActionError(null);
    setDialogOpen(true);
  }

  function openEdit(s: ServicioConHistorial) {
    setEditing(s);
    reset({
      nombre:                s.nombre,
      modalidad:             s.modalidad,
      tarifa_actual:         s.tarifa_actual ?? null,
      tarifa_moneda:         (s.tarifa_moneda as typeof MONEDAS[number]) ?? "ARS",
      ciclo_facturacion:     s.ciclo_facturacion,
      dia_cierre_ciclo:      s.dia_cierre_ciclo ?? null,
      tope_unidades_periodo: s.tope_unidades_periodo ?? null,
      tarifa_unidad_extra:   s.tarifa_unidad_extra ?? null,
      proyecto_total:        s.proyecto_total ?? null,
      proyecto_estado:       s.proyecto_estado,
      notas:                 s.notas ?? null,
    });
    setActionError(null);
    setDialogOpen(true);
  }

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (editing) {
        await updateServicio(editing.id, {
          nombre:                data.nombre,
          modalidad:             data.modalidad,
          tarifa_actual:         data.tarifa_actual ?? null,
          tarifa_moneda:         data.tarifa_moneda,
          ciclo_facturacion:     data.ciclo_facturacion,
          dia_cierre_ciclo:      data.dia_cierre_ciclo ?? null,
          tope_unidades_periodo: data.tope_unidades_periodo ?? null,
          tarifa_unidad_extra:   data.tarifa_unidad_extra ?? null,
          proyecto_total:        data.proyecto_total ?? null,
          proyecto_estado:       data.proyecto_estado,
          notas:                 data.notas ?? null,
        });
      } else {
        await createServicio({
          cliente_id:            cliente.id,
          nombre:                data.nombre,
          modalidad:             data.modalidad,
          tarifa_actual:         data.tarifa_actual ?? null,
          tarifa_moneda:         data.tarifa_moneda,
          ciclo_facturacion:     data.ciclo_facturacion,
          dia_cierre_ciclo:      data.dia_cierre_ciclo ?? null,
          tope_unidades_periodo: data.tope_unidades_periodo ?? null,
          tarifa_unidad_extra:   data.tarifa_unidad_extra ?? null,
          proyecto_total:        data.proyecto_total ?? null,
          proyecto_estado:       data.proyecto_estado,
          notas:                 data.notas ?? null,
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
      await archivarServicio(toArchive.id);
      setArchiveOpen(false);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al archivar");
    } finally {
      setIsArchiving(false);
    }
  }

  async function toggleHistorial(servicioId: string) {
    const abierto = !historialAbierto[servicioId];
    setHistorialAbierto((prev) => ({ ...prev, [servicioId]: abierto }));

    if (abierto && !historialData[servicioId]) {
      setHistorialLoading((prev) => ({ ...prev, [servicioId]: true }));
      try {
        const data = await getTarifasHistorial(servicioId);
        setHistorialData((prev) => ({ ...prev, [servicioId]: data }));
      } finally {
        setHistorialLoading((prev) => ({ ...prev, [servicioId]: false }));
      }
    }
  }

  const activos   = servicios.filter((s) => !s.archivado);
  const archivados = servicios.filter((s) => s.archivado);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activos.length === 0 ? "Sin servicios activos." : `${activos.length} servicio${activos.length !== 1 ? "s" : ""} activo${activos.length !== 1 ? "s" : ""}`}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo servicio
        </Button>
      </div>

      {activos.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {activos.map((s) => (
            <ServicioRow
              key={s.id}
              servicio={s}
              historialAbierto={!!historialAbierto[s.id]}
              historialData={historialData[s.id]}
              historialLoading={!!historialLoading[s.id]}
              onEdit={() => openEdit(s)}
              onArchive={() => { setToArchive(s); setActionError(null); setArchiveOpen(true); }}
              onToggleHistorial={() => toggleHistorial(s.id)}
            />
          ))}
        </div>
      )}

      {archivados.length > 0 && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer select-none flex items-center gap-1 hover:text-foreground">
            <ChevronDown className="h-3 w-3 group-open:hidden" />
            <ChevronUp className="h-3 w-3 hidden group-open:block" />
            {archivados.length} archivado{archivados.length !== 1 ? "s" : ""}
          </summary>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border mt-2 opacity-60">
            {archivados.map((s) => (
              <ServicioRow
                key={s.id}
                servicio={s}
                historialAbierto={false}
                historialData={undefined}
                historialLoading={false}
                onEdit={() => openEdit(s)}
                onToggleHistorial={() => {}}
              />
            ))}
          </div>
        </details>
      )}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {/* Editor modal */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Editar servicio" : "Nuevo servicio"}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
      >
        <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="srv-nombre">Nombre del servicio</Label>
            <Input id="srv-nombre" placeholder="Ej: Sesiones de psicopedagogía" autoFocus {...register("nombre")} />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          {/* Modalidad + Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Modalidad</Label>
              <Controller
                name="modalidad"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={MODALIDADES.map((m) => ({ value: m, label: MODALIDAD_LABEL[m] }))}
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v)}
                    className="w-full"
                  />
                )}
              />
            </div>

            {modalidad !== "proyecto" && (
              <div className="flex flex-col gap-1.5">
                <Label>Ciclo de facturación</Label>
                <Controller
                  name="ciclo_facturacion"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={CICLOS.map((c) => ({ value: c, label: CICLO_LABEL[c] }))}
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="w-full"
                    />
                  )}
                />
              </div>
            )}
          </div>

          {/* Tarifa */}
          {modalidad === "comision" ? (
            <p className="text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-2">
              Las comisiones se cargan con monto variable en cada registro. No requiere tarifa fija.
            </p>
          ) : modalidad !== "proyecto" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="srv-tarifa">
                  Tarifa {modalidad === "abono" ? "(abono mensual)" : modalidad === "hora" ? "(por hora)" : "(por sesión)"}
                </Label>
                <Input
                  id="srv-tarifa"
                  type="number"
                  placeholder="0"
                  {...register("tarifa_actual", { setValueAs: (v) => v === "" ? null : parseFloat(v) || null })}
                />
                {errors.tarifa_actual && <p className="text-xs text-destructive">{errors.tarifa_actual.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Moneda</Label>
                <Controller
                  name="tarifa_moneda"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={MONEDAS.map((m) => ({ value: m, label: m }))}
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="w-full"
                    />
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="srv-total">Monto total del proyecto</Label>
                <Input
                  id="srv-total"
                  type="number"
                  placeholder="0"
                  {...register("proyecto_total", { setValueAs: (v) => v === "" ? null : parseFloat(v) || null })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Estado del proyecto</Label>
                <Controller
                  name="proyecto_estado"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={ESTADOS_PROYECTO.map((e) => ({
                        value: e,
                        label: e.charAt(0).toUpperCase() + e.slice(1),
                      }))}
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="w-full"
                    />
                  )}
                />
              </div>
            </div>
          )}

          {/* Día de cierre */}
          {["mensual", "quincenal", "al_cierre"].includes(watch("ciclo_facturacion")) && modalidad !== "proyecto" && (
            <div className="flex flex-col gap-1.5 w-40">
              <Label htmlFor="srv-cierre">Día de cierre del ciclo</Label>
              <Input
                id="srv-cierre"
                type="number"
                min={1}
                max={31}
                placeholder="30"
                {...register("dia_cierre_ciclo", { setValueAs: (v) => v === "" ? null : parseInt(v) || null })}
              />
            </div>
          )}

          {/* Tope mensual */}
          {modalidad !== "proyecto" && modalidad !== "comision" && (
            <div className="flex flex-col gap-3 border border-border rounded-lg p-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="srv-tope">Tope mensual de unidades (opcional)</Label>
                <Input
                  id="srv-tope"
                  type="number"
                  min={1}
                  placeholder="Ej: 4 sesiones por mes"
                  className="w-40"
                  {...register("tope_unidades_periodo", { setValueAs: (v) => v === "" ? null : parseInt(v) || null })}
                />
                <p className="text-xs text-muted-foreground">Si el cliente supera este tope, aplica la tarifa extra.</p>
              </div>
              {tieneTope && (
                <div className="flex flex-col gap-1.5 w-40">
                  <Label htmlFor="srv-extra">Tarifa unidad extra</Label>
                  <Input
                    id="srv-extra"
                    type="number"
                    placeholder="0"
                    {...register("tarifa_unidad_extra", { setValueAs: (v) => v === "" ? null : parseFloat(v) || null })}
                  />
                </div>
              )}
            </div>
          )}

          {/* Notas */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="srv-notas">Notas</Label>
            <textarea
              id="srv-notas"
              rows={2}
              placeholder="Notas sobre el servicio"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              {...register("notas")}
            />
          </div>

          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        </div>
      </FormDialog>

      <DeleteConfirm
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="¿Archivar servicio?"
        description={`"${toArchive?.nombre}" dejará de estar disponible para nuevos registros.`}
        onConfirm={onArchive}
        isDeleting={isArchiving}
      />
    </div>
  );
}

// ── Fila de servicio ──────────────────────────────────────────────────────────

function ServicioRow({
  servicio,
  historialAbierto,
  historialData,
  historialLoading,
  onEdit,
  onArchive,
  onToggleHistorial,
}: {
  servicio: ServicioConHistorial;
  historialAbierto: boolean;
  historialData: TarifaHistorial[] | undefined;
  historialLoading: boolean;
  onEdit: () => void;
  onArchive?: () => void;
  onToggleHistorial: () => void;
}) {
  const tarifaStr = servicio.modalidad === "comision"
    ? "Comisión variable"
    : servicio.tarifa_actual != null
      ? `${servicio.tarifa_moneda} ${new Intl.NumberFormat("es-AR").format(servicio.tarifa_actual)}`
      : "Sin tarifa";

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-sm font-medium truncate">{servicio.nombre}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {MODALIDAD_LABEL[servicio.modalidad]} · {tarifaStr}
              {servicio.tope_unidades_periodo && ` · Tope ${servicio.tope_unidades_periodo}/mes`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleHistorial}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-surface"
          >
            Historial
            {historialAbierto ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <Button size="icon-sm" variant="ghost" onClick={onEdit} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {onArchive && !servicio.archivado && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onArchive}
              title="Archivar"
              className="text-muted-foreground hover:text-destructive"
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Historial de tarifas */}
      {historialAbierto && (
        <div className="px-4 pb-3 border-t border-border bg-surface/30">
          {historialLoading && <p className="text-xs text-muted-foreground py-2">Cargando historial…</p>}
          {!historialLoading && historialData && historialData.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">Sin historial de tarifas.</p>
          )}
          {!historialLoading && historialData && historialData.length > 0 && (
            <div className="flex flex-col gap-1 pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Historial de tarifas</p>
              {historialData.map((h) => (
                <div key={h.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {h.vigente_desde}
                    {h.vigente_hasta ? ` → ${h.vigente_hasta}` : " → vigente"}
                  </span>
                  <span className={cn("font-medium", !h.vigente_hasta && "text-primary")}>
                    {h.moneda} {new Intl.NumberFormat("es-AR").format(h.tarifa)}
                    {!h.vigente_hasta && " ✓"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
