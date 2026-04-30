"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CheckSquare, Square, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  getPagos,
  createPago,
  reasignarPago,
  getRegistrosPendientes,
  deletePago,
} from "@/lib/supabase/actions/pagos";
import type { ClienteConSaldo } from "@/lib/supabase/actions/clientes";
import type { PagoConCuenta } from "@/lib/supabase/actions/pagos";
import type { Cuenta, RegistroTrabajo } from "@/types/supabase";
import { METODOS } from "@/lib/supabase/actions/movimientos-types";

const schema = z.object({
  fecha:            z.string().min(1),
  monto:            z.number().positive("El monto es requerido"),
  moneda:           z.enum(["ARS", "USD"]),
  metodo:           z.string().min(1, "Seleccioná un método"),
  cuenta_destino_id: z.string().nullable().optional(),
  observaciones:    z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

function todayStr() { return new Date().toISOString().slice(0, 10); }

function formatMonto(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(n);
}

interface Props {
  cliente: ClienteConSaldo;
  cuentas: Cuenta[];
}

export function PagosTab({ cliente, cuentas }: Props) {
  const router = useRouter();
  const [pagos, setPagos] = useState<PagoConCuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Reasignación post-pago
  const [ultimoPagoId, setUltimoPagoId] = useState<string | null>(null);
  const [asignacionesActuales, setAsignacionesActuales] = useState<{ registro_id: string }[]>([]);
  const [pendientesDisponibles, setPendientesDisponibles] = useState<RegistroTrabajo[]>([]);
  const [reasignando, setReasignando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fecha: todayStr(), monto: 0, moneda: "ARS", metodo: "", cuenta_destino_id: null, observaciones: null },
  });

  const moneda = watch("moneda");

  useEffect(() => {
    getPagos(cliente.id).then(setPagos).catch(() => setPagos([])).finally(() => setLoading(false));
  }, [cliente.id]);

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const result = await createPago({
        cliente_id:       cliente.id,
        cliente_nombre:   cliente.nombre,
        fecha:            data.fecha,
        monto:            data.monto,
        moneda:           data.moneda,
        metodo:           data.metodo,
        cuenta_destino_id: data.cuenta_destino_id || null,
        observaciones:    data.observaciones || null,
      });
      setDialogOpen(false);
      reset();
      const nuevosPagos = await getPagos(cliente.id);
      setPagos(nuevosPagos);
      router.refresh();

      // Mostrar UI de reasignación si hay asignaciones
      if (result.asignaciones.length > 0 || result.saldo_restante > 0) {
        setUltimoPagoId(result.pago_id);
        setAsignacionesActuales(result.asignaciones.map((a) => ({ registro_id: a.registro_id })));
        setSeleccionados(new Set(result.asignaciones.map((a) => a.registro_id)));
        // Cargar todos los pendientes ANTES del pago + los recién asignados
        const pendientes = await getRegistrosPendientes(cliente.id);
        // Incluir los recién asignados que ya no están pendientes
        setPendientesDisponibles(pendientes);
        setReasignando(true);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al crear pago");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEliminarPago(p: PagoConCuenta) {
    const msg = p.movimiento_id
      ? "¿Eliminar este pago? También se eliminará el movimiento de ingreso vinculado."
      : "¿Eliminar este pago?";
    if (!confirm(msg)) return;
    try {
      await deletePago(p.id);
      const nuevosPagos = await getPagos(cliente.id);
      setPagos(nuevosPagos);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al eliminar pago");
    }
  }

  async function confirmarReasignacion() {
    if (!ultimoPagoId) return;
    try {
      await reasignarPago(ultimoPagoId, Array.from(seleccionados).map((id) => ({ registro_id: id })));
      setReasignando(false);
      const nuevosPagos = await getPagos(cliente.id);
      setPagos(nuevosPagos);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al reasignar");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pagos.length === 0 ? "Sin pagos registrados." : `${pagos.length} pago${pagos.length !== 1 ? "s" : ""}`}
        </p>
        <Button size="sm" onClick={() => { reset(); setActionError(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Registrar pago
        </Button>
      </div>

      {/* Panel de reasignación */}
      {reasignando && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Asignación automática realizada</p>
              <p className="text-xs text-muted-foreground mt-0.5">¿Querés cambiarla? Seleccioná los registros que cubre este pago.</p>
            </div>
          </div>
          {pendientesDisponibles.length === 0 && asignacionesActuales.length === 0 ? (
            <p className="text-xs text-muted-foreground">El pago quedó como saldo a cuenta (sin registros pendientes).</p>
          ) : (
            <div className="flex flex-col gap-1">
              {[...asignacionesActuales.map((a) => a.registro_id), ...pendientesDisponibles.map((r) => r.id)]
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .map((regId) => {
                  const reg = pendientesDisponibles.find((r) => r.id === regId);
                  if (!reg) return null;
                  const checked = seleccionados.has(regId);
                  return (
                    <button
                      key={regId}
                      type="button"
                      onClick={() => {
                        const s = new Set(seleccionados);
                        if (checked) s.delete(regId); else s.add(regId);
                        setSeleccionados(s);
                      }}
                      className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md hover:bg-surface transition-colors text-left"
                    >
                      {checked ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                      <span>{reg.fecha} · {formatMonto(reg.monto ?? 0)}</span>
                    </button>
                  );
                })}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={confirmarReasignacion}>Confirmar asignación</Button>
            <Button size="sm" variant="ghost" onClick={() => setReasignando(false)}>Dejar como está</Button>
          </div>
        </div>
      )}

      {/* Lista de pagos */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Cargando…</p>
      ) : pagos.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {pagos.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-medium">{formatMonto(p.monto, p.moneda)}</span>
                <span className="text-xs text-muted-foreground">
                  {p.fecha} · {p.metodo}
                  {p.cuenta_nombre && ` → ${p.cuenta_nombre}`}
                </span>
                {p.observaciones && (
                  <span className="text-xs text-muted-foreground italic">{p.observaciones}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleEliminarPago(p)}
                className="text-destructive hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {/* Editor modal */}
      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Registrar pago"
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
      >
        <div className="flex flex-col gap-4">
          {/* Fecha */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pago-fecha">Fecha</Label>
            <Input id="pago-fecha" type="date" {...register("fecha")} />
          </div>

          {/* Monto + Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pago-monto">Monto</Label>
              <Input
                id="pago-monto"
                type="number"
                step="0.01"
                placeholder="0"
                {...register("monto", { valueAsNumber: true })}
              />
              {errors.monto && <p className="text-xs text-destructive">{errors.monto.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Moneda</Label>
              <Controller
                name="moneda"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={[{ value: "ARS", label: "ARS" }, { value: "USD", label: "USD" }]}
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v)}
                    className="w-full"
                  />
                )}
              />
            </div>
          </div>

          {/* Método */}
          <div className="flex flex-col gap-1.5">
            <Label>Método de pago</Label>
            <Controller
              name="metodo"
              control={control}
              render={({ field }) => (
                <NamedSelect
                  options={METODOS.map((m) => ({ value: m, label: m }))}
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                  placeholder="Seleccionar…"
                  className="w-full"
                />
              )}
            />
            {errors.metodo && <p className="text-xs text-destructive">{errors.metodo.message}</p>}
          </div>

          {/* Cuenta destino */}
          {cuentas.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Cuenta destino</Label>
              <Controller
                name="cuenta_destino_id"
                control={control}
                render={({ field }) => (
                  <NamedSelect
                    options={[
                      { value: "", label: "Sin especificar" },
                      ...cuentas.map((c) => ({ value: c.id, label: `${c.nombre} (${c.moneda})` })),
                    ]}
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                    placeholder="Sin especificar"
                    className="w-full"
                  />
                )}
              />
            </div>
          )}

          {/* Observaciones */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pago-obs">Observaciones</Label>
            <Input id="pago-obs" placeholder="Opcional" {...register("observaciones")} />
          </div>

          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        </div>
      </FormDialog>
    </div>
  );
}
