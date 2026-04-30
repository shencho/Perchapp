"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckSquare, Square, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedSelect } from "@/components/ui/named-select";
import { cn } from "@/lib/utils";
import { createMovimiento } from "@/lib/supabase/actions/movimientos";
import { getDataPagoModal, createPagoFromMovimiento } from "@/lib/supabase/actions/pagos";
import { asignarPagoFIFO } from "@/lib/domain/asignarPagoFIFO";
import type { MovimientoInput } from "@/lib/supabase/actions/movimientos-types";
import type { RegistroTrabajo } from "@/types/supabase";

function formatMonto(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(n);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cliente: { id: string; nombre: string };
  movimientoData: MovimientoInput;
  serviciosDisponibles: { id: string; nombre: string; modalidad: string }[];
}

export function RegistrarPagoModal({ open, onClose, onConfirm, cliente, movimientoData, serviciosDisponibles }: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [registrosPendientes, setRegistrosPendientes] = useState<RegistroTrabajo[]>([]);
  const [saldoPendiente, setSaldoPendiente] = useState(0);

  const [opcion, setOpcion] = useState<"pago" | "suelto">("pago");
  const [asignaciones, setAsignaciones] = useState<Set<string>>(new Set());
  const [verManual, setVerManual] = useState(false);

  const [servicioNuevoId, setServicioNuevoId] = useState("");
  const [fechaNueva, setFechaNueva] = useState(todayStr());
  const [notasNueva, setNotasNueva] = useState("");

  const montoPago = movimientoData.monto;
  const moneda = movimientoData.moneda ?? "ARS";

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setOpcion("pago");
    setVerManual(false);
    setServicioNuevoId("");
    setFechaNueva(todayStr());
    setNotasNueva("");

    getDataPagoModal(cliente.id)
      .then(({ registrosPendientes: rp, saldoPendiente: sp }) => {
        setRegistrosPendientes(rp);
        setSaldoPendiente(sp);
        const fifo = asignarPagoFIFO(rp, montoPago);
        setAsignaciones(new Set(fifo.asignaciones.map((a) => a.registro_id)));
      })
      .catch(() => setError("Error al cargar datos del cliente"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cliente.id]);

  if (!open) return null;

  const caso: 1 | 2 | 3 = saldoPendiente === 0 ? 3 : saldoPendiente >= montoPago ? 1 : 2;
  const sobrante = montoPago - saldoPendiente;

  const servicioNuevo = serviciosDisponibles.find((s) => s.id === servicioNuevoId);
  const tipoRegistroNuevo =
    servicioNuevo?.modalidad === "comision" ? ("comision" as const) : ("sesion" as const);

  const sinServicios = opcion === "pago" && (caso === 2 || caso === 3) && serviciosDisponibles.length === 0;

  const puedeConfirmar =
    !sinServicios &&
    (opcion === "suelto" ||
      caso === 1 ||
      ((caso === 2 || caso === 3) && !!servicioNuevoId));

  async function handleConfirmar() {
    setSubmitting(true);
    setError(null);
    try {
      if (opcion === "suelto") {
        await createMovimiento(movimientoData);
      } else {
        const registros_asignados =
          caso === 1
            ? Array.from(asignaciones)
            : caso === 2
              ? registrosPendientes.map((r) => r.id)
              : [];

        const registro_nuevo =
          caso === 2 || caso === 3
            ? {
                servicio_id: servicioNuevoId,
                fecha: fechaNueva,
                monto: caso === 2 ? sobrante : montoPago,
                notas: notasNueva || null,
                tipo: tipoRegistroNuevo,
              }
            : null;

        await createPagoFromMovimiento({
          movimientoData,
          cliente_id: cliente.id,
          cliente_nombre: cliente.nombre,
          registros_asignados,
          registro_nuevo,
        });
      }
      onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al registrar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-10 sm:items-center sm:pt-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-semibold text-base">¿Cómo registrar este ingreso?</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cliente.nombre} · {formatMonto(montoPago, moneda)}
              {!loading && (
                <> · Saldo pendiente: <span className={saldoPendiente > 0 ? "text-amber-400" : "text-green-400"}>{formatMonto(saldoPendiente, moneda)}</span></>
              )}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Selector de opción */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpcion("pago")}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                    opcion === "pago"
                      ? "bg-primary/10 border-primary/50 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  Pago del cliente
                </button>
                <button
                  type="button"
                  onClick={() => setOpcion("suelto")}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                    opcion === "suelto"
                      ? "bg-primary/10 border-primary/50 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  Ingreso suelto
                </button>
              </div>

              {/* Opción A — Pago del cliente */}
              {opcion === "pago" && (
                <div className="space-y-3">
                  {/* CASO 1: pago cubre parte del saldo */}
                  {caso === 1 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Este pago cubre{" "}
                        <span className="text-foreground font-medium">{formatMonto(montoPago, moneda)}</span> de los{" "}
                        <span className="text-foreground font-medium">{formatMonto(saldoPendiente, moneda)}</span>{" "}
                        pendientes.
                      </p>

                      {/* Preview FIFO */}
                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-surface text-xs text-muted-foreground font-medium">
                          Registros que cubrirá (orden cronológico)
                        </div>
                        {registrosPendientes
                          .filter((r) => asignaciones.has(r.id))
                          .map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between px-3 py-2 border-t border-border text-sm"
                            >
                              <span className="text-muted-foreground">{r.fecha}</span>
                              <span className="font-medium text-green-400">{formatMonto(r.monto ?? 0, moneda)}</span>
                            </div>
                          ))}
                        {asignaciones.size === 0 && (
                          <div className="px-3 py-2 border-t border-border text-sm text-muted-foreground italic">
                            Ninguno seleccionado — el pago quedará a cuenta
                          </div>
                        )}
                      </div>

                      {/* Toggle manual */}
                      <button
                        type="button"
                        onClick={() => setVerManual(!verManual)}
                        className="text-xs text-primary hover:underline"
                      >
                        {verManual ? "Ocultar asignación manual" : "Cambiar asignación"}
                      </button>

                      {verManual && (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <div className="px-3 py-2 bg-surface text-xs text-muted-foreground font-medium">
                            Seleccioná los registros a cubrir
                          </div>
                          {registrosPendientes.map((r) => {
                            const checked = asignaciones.has(r.id);
                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  const s = new Set(asignaciones);
                                  if (checked) s.delete(r.id);
                                  else s.add(r.id);
                                  setAsignaciones(s);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 border-t border-border text-sm hover:bg-surface/50 transition-colors text-left"
                              >
                                {checked ? (
                                  <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className="text-muted-foreground">{r.fecha}</span>
                                {r.notas && (
                                  <span className="text-muted-foreground/60 text-xs truncate">{r.notas}</span>
                                )}
                                <span className="ml-auto font-medium tabular-nums">
                                  {formatMonto(r.monto ?? 0, moneda)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CASO 2: pago supera el saldo */}
                  {caso === 2 && (
                    <div className="space-y-3">
                      <div className="bg-amber-950/30 border border-amber-800/40 rounded-md px-3 py-2.5 space-y-1">
                        <p className="text-sm text-amber-300">
                          Este pago cubre todo el saldo pendiente ({formatMonto(saldoPendiente, moneda)}) y tiene
                          un sobrante de{" "}
                          <span className="font-medium">{formatMonto(sobrante, moneda)}</span>.
                        </p>
                        <p className="text-xs text-amber-300/70">
                          Los {registrosPendientes.length} registro{registrosPendientes.length !== 1 ? "s" : ""}{" "}
                          pendiente{registrosPendientes.length !== 1 ? "s" : ""} quedarán saldado{registrosPendientes.length !== 1 ? "s" : ""}.
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        El sobrante de{" "}
                        <span className="text-foreground font-medium">{formatMonto(sobrante, moneda)}</span>{" "}
                        se registrará como un nuevo trabajo:
                      </p>
                      <RegistroNuevoFields
                        serviciosDisponibles={serviciosDisponibles}
                        servicioNuevoId={servicioNuevoId}
                        setServicioNuevoId={setServicioNuevoId}
                        fechaNueva={fechaNueva}
                        setFechaNueva={setFechaNueva}
                        notasNueva={notasNueva}
                        setNotasNueva={setNotasNueva}
                      />
                    </div>
                  )}

                  {/* CASO 3: sin saldo pendiente */}
                  {caso === 3 && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 bg-surface border border-border rounded-md px-3 py-2.5">
                        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          {cliente.nombre} no tiene saldo pendiente. ¿A qué servicio corresponde este cobro de{" "}
                          <span className="text-foreground font-medium">{formatMonto(montoPago, moneda)}</span>?
                        </p>
                      </div>
                      <RegistroNuevoFields
                        serviciosDisponibles={serviciosDisponibles}
                        servicioNuevoId={servicioNuevoId}
                        setServicioNuevoId={setServicioNuevoId}
                        fechaNueva={fechaNueva}
                        setFechaNueva={setFechaNueva}
                        notasNueva={notasNueva}
                        setNotasNueva={setNotasNueva}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Opción B — Ingreso suelto */}
              {opcion === "suelto" && (
                <p className="text-sm text-muted-foreground border border-dashed border-border rounded-md px-4 py-3">
                  Se creará el movimiento de ingreso sin vincularlo a un cobro de{" "}
                  <span className="text-foreground">{cliente.nombre}</span>. El saldo del cliente no cambiará.
                </p>
              )}
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={submitting || loading || !puedeConfirmar}>
            {submitting ? "Guardando…" : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente para campos de registro nuevo (CASO 2 y 3) ─────────────────

function RegistroNuevoFields({
  serviciosDisponibles,
  servicioNuevoId,
  setServicioNuevoId,
  fechaNueva,
  setFechaNueva,
  notasNueva,
  setNotasNueva,
}: {
  serviciosDisponibles: { id: string; nombre: string; modalidad: string }[];
  servicioNuevoId: string;
  setServicioNuevoId: (v: string) => void;
  fechaNueva: string;
  setFechaNueva: (v: string) => void;
  notasNueva: string;
  setNotasNueva: (v: string) => void;
}) {
  console.log("[modal-debug] componente renderizado");
  console.log("[modal-debug] props recibidas:", JSON.stringify({ serviciosDisponibles }, null, 2));
  console.log("[modal-debug] options que se van a renderizar:", JSON.stringify(serviciosDisponibles?.filter((s) => !(s as { archivado?: boolean }).archivado), null, 2));

  if (serviciosDisponibles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground border border-dashed border-border rounded-md px-4 py-3">
        Este cliente no tiene servicios activos. Andá al tab{" "}
        <a href="#servicios" className="underline hover:text-foreground">Servicios</a>{" "}
        para crear uno antes de registrar el pago.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>
          Servicio <span className="text-destructive">*</span>
        </Label>
        <NamedSelect
          options={serviciosDisponibles.map((s) => ({ value: s.id, label: s.nombre }))}
          value={servicioNuevoId}
          onValueChange={(v) => setServicioNuevoId(v ?? "")}
          placeholder="Seleccionar servicio…"
          className="w-full"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Fecha del registro</Label>
          <Input type="date" value={fechaNueva} onChange={(e) => setFechaNueva(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Notas</Label>
          <Input
            placeholder="Opcional"
            value={notasNueva}
            onChange={(e) => setNotasNueva(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
