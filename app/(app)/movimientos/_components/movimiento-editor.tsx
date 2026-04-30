"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { cn } from "@/lib/utils";
import { createMovimiento, updateMovimiento } from "@/lib/supabase/actions/movimientos";
import { getServicios } from "@/lib/supabase/actions/servicios";
import {
  TIPOS_MOV,
  AMBITOS,
  METODOS,
  CLASIFICACIONES,
  FRECUENCIAS,
  type MovimientoInput,
} from "@/lib/supabase/actions/movimientos-types";
import type { Movimiento, Cuenta, Tarjeta, Categoria } from "@/types/supabase";
import { CreatableSelect, type CatOption } from "./creatable-select";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  tipo:              z.enum(TIPOS_MOV),
  ambito:            z.enum(AMBITOS),
  moneda:            z.enum(["ARS", "USD"]),
  tipo_cambio:       z.number().positive().nullable().optional(),
  monto:             z.number().positive("El monto debe ser mayor a 0"),
  categoria_id:      z.string().nullable().optional(),
  clasificacion:     z.enum(CLASIFICACIONES),
  cuotas:            z.number().int().min(1),
  frecuencia:        z.enum(FRECUENCIAS),
  necesidad:         z.number().int().min(1).max(5).nullable().optional(),
  metodo:            z.enum(METODOS).nullable().optional(),
  cuenta_id:         z.string().nullable().optional(),
  tarjeta_id:        z.string().nullable().optional(),
  fecha_vencimiento: z.string().nullable().optional(),
  debita_de:         z.enum(["cuenta", "tarjeta"]).nullable().optional(),
  cuenta_destino_id: z.string().nullable().optional(),
  concepto:          z.string().nullable().optional(),
  descripcion:       z.string().nullable().optional(),
  cantidad:          z.number().int().min(1),
  observaciones:     z.string().nullable().optional(),
  fecha:             z.string().optional(),
  cliente_id:        z.string().nullable().optional(),
  servicio_id:       z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.ambito === "Profesional" && data.tipo !== "Transferencia" && !data.cliente_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El cliente es requerido", path: ["cliente_id"] });
  }
});

type FormData = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Movimiento | null;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  clientes?: { id: string; nombre: string }[];
  defaultValues?: Partial<FormData>;
  suggestCategoria?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NECESIDAD_LABELS: Record<number, string> = {
  1: "Innecesario",
  2: "Prescindible",
  3: "Medio",
  4: "Necesario",
  5: "Esencial",
};

const NECESIDAD_COLORS: Record<number, string> = {
  1: "bg-red-900 border-red-700 text-red-200",
  2: "bg-orange-900 border-orange-700 text-orange-200",
  3: "bg-yellow-900 border-yellow-700 text-yellow-200",
  4: "bg-green-900 border-green-700 text-green-200",
  5: "bg-emerald-900 border-emerald-700 text-emerald-200",
};

function formatMonto(n: number | string, moneda = "ARS") {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: moneda }).format(num);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MovimientoEditor({ open, onClose, editing, cuentas, tarjetas, categorias, clientes = [], defaultValues, suggestCategoria }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCategorias, setLocalCategorias] = useState<Categoria[]>(categorias);
  const [padreId, setPadreId] = useState<string | null>(null);
  const [subcatId, setSubcatId] = useState<string | null>(null);
  const [serviciosCliente, setServiciosCliente] = useState<{ id: string; nombre: string }[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo:          "Egreso",
      ambito:        "Personal",
      moneda:        "ARS",
      clasificacion: "Variable",
      cuotas:        1,
      frecuencia:    "Corriente",
      cantidad:      1,
      fecha:         todayStr(),
      cliente_id:    null,
      servicio_id:   null,
      ...defaultValues,
    },
  });

  // Sincronizar si viene editing o defaultValues
  useEffect(() => {
    // Determina padreId/subcatId a partir de un categoria_id que puede ser padre o hijo
    function resolveCatId(catId: string | null | undefined) {
      if (!catId) { setPadreId(null); setSubcatId(null); return; }
      const cat = localCategorias.find((c) => c.id === catId);
      if (cat?.parent_id) {
        setPadreId(cat.parent_id);
        setSubcatId(cat.id);
      } else {
        setPadreId(catId);
        setSubcatId(null);
      }
    }

    if (editing) {
      resolveCatId(editing.categoria_id);
      reset({
        tipo:              editing.tipo as FormData["tipo"],
        ambito:            editing.ambito as FormData["ambito"],
        moneda:            (editing.moneda ?? "ARS") as "ARS" | "USD",
        tipo_cambio:       editing.tipo_cambio ?? undefined,
        monto:             editing.monto,
        clasificacion:     (editing.clasificacion ?? "Variable") as FormData["clasificacion"],
        cuotas:            editing.cuotas ?? 1,
        frecuencia:        (editing.frecuencia ?? "Corriente") as FormData["frecuencia"],
        necesidad:         editing.necesidad ?? undefined,
        metodo:            (editing.metodo ?? undefined) as FormData["metodo"],
        cuenta_id:         editing.cuenta_id ?? undefined,
        tarjeta_id:        editing.tarjeta_id ?? undefined,
        fecha_vencimiento: editing.fecha_vencimiento ?? undefined,
        debita_de:         (editing.debita_de ?? undefined) as FormData["debita_de"],
        cuenta_destino_id: editing.cuenta_destino_id ?? undefined,
        concepto:          editing.concepto ?? undefined,
        descripcion:       editing.descripcion ?? undefined,
        cantidad:          editing.cantidad ?? 1,
        observaciones:     editing.observaciones ?? undefined,
        fecha:             editing.fecha ?? todayStr(),
        cliente_id:        editing.cliente_id ?? null,
        servicio_id:       editing.servicio_id ?? null,
      });
    } else if (defaultValues) {
      resolveCatId(defaultValues.categoria_id as string | null | undefined);
      reset({ tipo: "Egreso", ambito: "Personal", moneda: "ARS", clasificacion: "Variable", cuotas: 1, frecuencia: "Corriente", cantidad: 1, fecha: todayStr(), ...defaultValues });
    } else {
      setPadreId(null);
      setSubcatId(null);
      reset({ tipo: "Egreso", ambito: "Personal", moneda: "ARS", clasificacion: "Variable", cuotas: 1, frecuencia: "Corriente", cantidad: 1, fecha: todayStr() });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open]);

  // Valores observados para condicionales
  const tipo         = watch("tipo");
  const ambito       = watch("ambito");
  const moneda       = watch("moneda");
  const clasificacion = watch("clasificacion");
  const metodo       = watch("metodo");
  const debita_de    = watch("debita_de");
  const cuotas       = watch("cuotas");
  const monto        = watch("monto");
  const cantidad     = watch("cantidad");
  const clienteId    = watch("cliente_id");

  // Limpiar cliente/servicio cuando se cambia a Personal
  useEffect(() => {
    if (ambito !== "Profesional") {
      setValue("cliente_id", null);
      setValue("servicio_id", null);
      setServiciosCliente([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambito]);

  // Cargar servicios cuando cambia el cliente
  useEffect(() => {
    if (!clienteId) { setServiciosCliente([]); return; }
    getServicios(clienteId)
      .then((s) => setServiciosCliente(s.filter((sv) => !sv.archivado).map((sv) => ({ id: sv.id, nombre: sv.nombre }))))
      .catch(() => setServiciosCliente([]));
  }, [clienteId]);

  // Categorías padre (sin parent_id)
  const catsPadre = localCategorias.filter((c) => !c.parent_id && (
    tipo === "Transferencia" ? false : c.tipo === tipo || c.tipo === "Ambos"
  ));
  // Subcategorías del padre seleccionado — usa padreId (estado local, no RHF)
  const catsHijas = padreId
    ? localCategorias.filter((c) => c.parent_id === padreId)
    : [];

  // Al cambiar tipo o categoría padre, limpiar subcategoría
  useEffect(() => { setSubcatId(null); }, [tipo, padreId]);

  // Visibilidad de tarjeta y fecha_vencimiento
  const showTarjeta = metodo === "Crédito" || (metodo === "Débito automático" && debita_de === "tarjeta");
  const showFechaVto = showTarjeta;
  const showDebitaDe = metodo === "Débito automático";
  const showNecesidad = tipo === "Egreso" && ambito === "Personal";
  const showCuotasChip = clasificacion === "Cuotas";
  const showTipoCambio = moneda === "USD";
  const showCuentaDestino = tipo === "Transferencia";

  // Chip de cuotas en vivo
  const unitario = monto && cuotas ? (monto / (cuotas || 1)) : 0;
  const total    = cantidad && monto ? cantidad * monto : monto;

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: MovimientoInput = {
        ...values,
        tipo_cambio:       values.tipo_cambio ?? null,
        concepto:          values.concepto ?? null,
        descripcion:       values.descripcion ?? null,
        categoria_id:      subcatId ?? padreId ?? null,
        necesidad:         showNecesidad ? (values.necesidad ?? null) : null,
        metodo:            values.metodo ?? null,
        cuenta_id:         values.cuenta_id ?? null,
        tarjeta_id:        showTarjeta ? (values.tarjeta_id ?? null) : null,
        fecha_vencimiento: showFechaVto ? (values.fecha_vencimiento ?? null) : null,
        debita_de:         showDebitaDe ? (values.debita_de ?? null) : null,
        cuenta_destino_id: showCuentaDestino ? (values.cuenta_destino_id ?? null) : null,
        observaciones:     values.observaciones ?? null,
        cliente_id:        values.ambito === "Profesional" ? (values.cliente_id ?? null) : null,
        servicio_id:       values.ambito === "Profesional" ? (values.servicio_id ?? null) : null,
        unitario:          clasificacion === "Cuotas" ? unitario : values.monto,
      };

      if (editing) {
        await updateMovimiento(editing.id, payload);
      } else {
        await createMovimiento(payload);
      }

      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 sm:items-center sm:pt-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-semibold text-base">
            {editing ? "Editar movimiento" : "Nuevo movimiento"}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form body — scrollable */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-4">

            {/* TIPO + ÁMBITO */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={TIPOS_MOV.map(t => ({ value: t, label: t }))}
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="w-full"
                    />
                  )}
                />
              </div>

              {tipo !== "Transferencia" && (
                <div className="space-y-1.5">
                  <Label>Ámbito</Label>
                  <Controller
                    name="ambito"
                    control={control}
                    render={({ field }) => (
                      <NamedSelect
                        options={AMBITOS.map(a => ({ value: a, label: a }))}
                        value={field.value}
                        onValueChange={(v) => v && field.onChange(v)}
                        className="w-full"
                      />
                    )}
                  />
                </div>
              )}

              {ambito === "Profesional" && tipo !== "Transferencia" && (
                <div className="col-span-2">
                  {clientes.length === 0 ? (
                    <p className="text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-2">
                      Aún no tenés clientes. Agregalos en{" "}
                      <a href="/clientes" className="underline hover:text-foreground">/clientes</a>{" "}
                      para vincularlos a movimientos.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Cliente</Label>
                        <Controller
                          name="cliente_id"
                          control={control}
                          render={({ field }) => (
                            <NamedSelect
                              options={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
                              value={field.value ?? ""}
                              onValueChange={(v) => {
                                field.onChange(v || null);
                                setValue("servicio_id", null);
                              }}
                              placeholder="Seleccionar cliente…"
                              className="w-full"
                            />
                          )}
                        />
                        {errors.cliente_id && (
                          <p className="text-xs text-destructive">{errors.cliente_id.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Servicio</Label>
                        <Controller
                          name="servicio_id"
                          control={control}
                          render={({ field }) => (
                            <NamedSelect
                              options={serviciosCliente.map((s) => ({ value: s.id, label: s.nombre }))}
                              value={field.value ?? ""}
                              onValueChange={(v) => field.onChange(v || null)}
                              placeholder="Opcional…"
                              disabled={!clienteId}
                              className="w-full"
                            />
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MONEDA + TIPO DE CAMBIO */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Controller
                  name="moneda"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={[{ value: "ARS", label: "ARS — Pesos" }, { value: "USD", label: "USD — Dólares" }]}
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="w-full"
                    />
                  )}
                />
              </div>

              {showTipoCambio && (
                <div className="space-y-1.5">
                  <Label>Tipo de cambio</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="ej. 1200"
                    {...register("tipo_cambio", { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>

            {/* MONTO */}
            <div className="space-y-1.5">
              <Label>Monto ({moneda})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("monto", { valueAsNumber: true })}
                className={cn(errors.monto && "border-destructive")}
              />
              {errors.monto && <p className="text-xs text-destructive">{errors.monto.message}</p>}
            </div>

            {/* CATEGORÍA + SUBCATEGORÍA */}
            {tipo !== "Transferencia" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <CreatableSelect
                    options={catsPadre as CatOption[]}
                    value={padreId ?? ""}
                    onValueChange={(v) => {
                      setPadreId(v || null);
                      setSubcatId(null);
                    }}
                    onCreated={(opt) => {
                      setLocalCategorias((prev) => [
                        ...prev,
                        {
                          id: opt.id,
                          nombre: opt.nombre,
                          tipo: tipo === "Ingreso" ? "Ingreso" : "Egreso",
                          parent_id: null,
                          user_id: "",
                          color: null,
                          icono: null,
                          orden: 999,
                          archivada: false,
                          created_at: new Date().toISOString(),
                        },
                      ]);
                      setPadreId(opt.id);
                      setSubcatId(null);
                    }}
                    tipo={tipo === "Ingreso" ? "Ingreso" : "Egreso"}
                    parent_id={null}
                    suggestCreate={suggestCategoria}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Subcategoría</Label>
                  <CreatableSelect
                    options={catsHijas as CatOption[]}
                    value={subcatId ?? ""}
                    onValueChange={(v) => setSubcatId(v || null)}
                    onCreated={(opt) => {
                      setLocalCategorias((prev) => [
                        ...prev,
                        {
                          id: opt.id,
                          nombre: opt.nombre,
                          tipo: tipo === "Ingreso" ? "Ingreso" : "Egreso",
                          parent_id: padreId ?? null,
                          user_id: "",
                          color: null,
                          icono: null,
                          orden: 999,
                          archivada: false,
                          created_at: new Date().toISOString(),
                        },
                      ]);
                      setSubcatId(opt.id);
                    }}
                    tipo={tipo === "Ingreso" ? "Ingreso" : "Egreso"}
                    parent_id={padreId}
                    placeholder="Opcional"
                    disabled={!padreId}
                  />
                </div>
              </div>
            )}

            {/* CONCEPTO + DESCRIPCIÓN */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Concepto</Label>
                <Input placeholder="ej. Spotify, Alquiler" {...register("concepto")} />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Input placeholder="Detalle adicional" {...register("descripcion")} />
              </div>
            </div>

            {/* CLASIFICACIÓN + FRECUENCIA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Clasificación</Label>
                <Controller
                  name="clasificacion"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={CLASIFICACIONES.map(c => ({ value: c, label: c }))}
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="w-full"
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Frecuencia</Label>
                <Controller
                  name="frecuencia"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={FRECUENCIAS.map(f => ({ value: f, label: f }))}
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      className="w-full"
                    />
                  )}
                />
              </div>
            </div>

            {/* CUOTAS + chip */}
            {showCuotasChip && (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label>Número de cuotas</Label>
                  <Input type="number" min={1} step={1} {...register("cuotas", { valueAsNumber: true })} className="w-32" />
                </div>
                {cuotas > 1 && monto > 0 && (
                  <div className="inline-flex items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1 text-sm text-muted-foreground">
                    <span>💳</span>
                    <span>
                      {cuotas} cuotas de {formatMonto(unitario, moneda)} · {formatMonto(total, moneda)} total
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* NECESIDAD (picker 1-5) */}
            {showNecesidad && (
              <div className="space-y-1.5">
                <Label>Necesidad</Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const current = watch("necesidad");
                    const isSelected = current === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setValue("necesidad", isSelected ? null : n)}
                        className={cn(
                          "px-3 py-1 rounded-full border text-xs font-medium transition-colors",
                          isSelected
                            ? NECESIDAD_COLORS[n]
                            : "border-border text-muted-foreground hover:border-foreground/40"
                        )}
                      >
                        {n} · {NECESIDAD_LABELS[n]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MÉTODO */}
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Controller
                name="metodo"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={METODOS.map(m => ({ value: m, label: m }))}
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                    placeholder="Seleccionar…"
                    className="w-full"
                  />
                )}
              />
            </div>

            {/* DÉBITO AUTOMÁTICO → debita_de */}
            {showDebitaDe && (
              <div className="space-y-1.5">
                <Label>Se debita de</Label>
                <Controller
                  name="debita_de"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={[{ value: "cuenta", label: "Cuenta bancaria" }, { value: "tarjeta", label: "Tarjeta de crédito" }]}
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || null)}
                      placeholder="Seleccionar…"
                      className="w-full"
                    />
                  )}
                />
              </div>
            )}

            {/* TARJETA + FECHA VENCIMIENTO */}
            {showTarjeta && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tarjeta</Label>
                  <Controller
                    name="tarjeta_id"
                    control={control}
                    render={({ field }) => (
                      <NamedSelect
                        options={tarjetas.map(t => ({ value: t.id, label: t.nombre }))}
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v)}
                        placeholder="Seleccionar…"
                      />
                    )}
                  />
                </div>
                {showFechaVto && (
                  <div className="space-y-1.5">
                    <Label>Fecha vencimiento</Label>
                    <Input type="date" {...register("fecha_vencimiento")} />
                  </div>
                )}
              </div>
            )}

            {/* CUENTA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{tipo === "Transferencia" ? "Cuenta origen" : "Cuenta"}</Label>
                <Controller
                  name="cuenta_id"
                  control={control}
                  render={({ field }) => (
                    <NamedSelect
                      options={cuentas.map(c => ({ value: c.id, label: c.nombre }))}
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v)}
                      placeholder="Seleccionar…"
                    />
                  )}
                />
              </div>

              {/* CUENTA DESTINO (solo Transferencia) */}
              {showCuentaDestino && (
                <div className="space-y-1.5">
                  <Label>Cuenta destino</Label>
                  <Controller
                    name="cuenta_destino_id"
                    control={control}
                    render={({ field }) => (
                      <NamedSelect
                        options={cuentas.map(c => ({ value: c.id, label: c.nombre }))}
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v)}
                        placeholder="Seleccionar…"
                      />
                    )}
                  />
                </div>
              )}
            </div>

            {/* FECHA CONSUMO + CANTIDAD */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha consumo</Label>
                <Input type="date" {...register("fecha")} />
              </div>
              <div className="space-y-1.5">
                <Label>Cantidad</Label>
                <Input type="number" min={1} step={1} {...register("cantidad", { valueAsNumber: true })} />
              </div>
            </div>

            {/* OBSERVACIONES */}
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Input placeholder="Notas adicionales" {...register("observaciones")} />
            </div>

          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex-shrink-0 flex items-center justify-between gap-3">
            {error && <p className="text-xs text-destructive flex-1">{error}</p>}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando…" : editing ? "Guardar cambios" : "Crear"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
