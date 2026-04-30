"use server";

import { createClient } from "@/lib/supabase/server";
import { asignarPagoFIFO } from "@/lib/domain/asignarPagoFIFO";
import type { PagoCliente } from "@/types/supabase";

export type PagoConCuenta = PagoCliente & {
  cuenta_nombre: string | null;
};

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getPagos(clienteId: string): Promise<PagoConCuenta[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("pagos_cliente")
    .select("*, cuentas(nombre)")
    .eq("cliente_id", clienteId)
    .eq("user_id", user.id)
    .order("fecha", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((p) => ({
    ...p,
    cuenta_nombre: (p.cuentas as { nombre: string } | null)?.nombre ?? null,
  }));
}

export async function getRegistrosPendientes(clienteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("registros_trabajo")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("user_id", user.id)
    .is("pago_id", null)
    .order("fecha");

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export interface CreatePagoInput {
  cliente_id:      string;
  cliente_nombre:  string;
  fecha:           string;
  monto:           number;
  moneda:          string;
  metodo:          string;
  cuenta_destino_id?: string | null;
  observaciones?:  string | null;
}

export interface ResultadoPago {
  pago_id:      string;
  asignaciones: { registro_id: string; monto: number }[];
  saldo_restante: number;
}

export async function createPago(data: CreatePagoInput): Promise<ResultadoPago> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // (a) Insertar pago
  const { data: pago, error: pagoErr } = await supabase
    .from("pagos_cliente")
    .insert({
      user_id:          user.id,
      cliente_id:       data.cliente_id,
      fecha:            data.fecha,
      monto:            data.monto,
      moneda:           data.moneda,
      metodo:           data.metodo,
      cuenta_destino_id: data.cuenta_destino_id ?? null,
      observaciones:    data.observaciones ?? null,
    })
    .select()
    .single();

  if (pagoErr || !pago) throw new Error(pagoErr?.message ?? "Error al crear pago");

  // (b) Insertar movimiento vinculado
  const { data: movimiento, error: movErr } = await supabase
    .from("movimientos")
    .insert({
      user_id:    user.id,
      tipo:       "Ingreso",
      ambito:     "Profesional",
      cliente_id: data.cliente_id,
      monto:      data.monto,
      moneda:     data.moneda,
      metodo:     data.metodo as "Efectivo" | "Transferencia" | "Billetera virtual" | "Crédito" | "Débito automático" | "Débito",
      cuenta_id:  data.cuenta_destino_id ?? null,
      concepto:   `Pago de ${data.cliente_nombre}`,
      fecha:      data.fecha,
      clasificacion: "Variable",
      cuotas:     1,
      frecuencia: "Corriente",
      cantidad:   1,
    })
    .select("id")
    .single();

  // (c) Actualizar movimiento_id en el pago
  if (movimiento && !movErr) {
    await supabase
      .from("pagos_cliente")
      .update({ movimiento_id: movimiento.id })
      .eq("id", pago.id);
  }

  // (d) Asignación FIFO
  const pendientes = await getRegistrosPendientes(data.cliente_id);
  const { asignaciones, saldoRestante } = asignarPagoFIFO(pendientes, data.monto);

  // Marcar registros asignados con pago_id
  if (asignaciones.length > 0) {
    const ids = asignaciones.map((a) => a.registro_id);
    await supabase
      .from("registros_trabajo")
      .update({ pago_id: pago.id, facturado: true })
      .in("id", ids)
      .eq("user_id", user.id);
  }

  return { pago_id: pago.id, asignaciones, saldo_restante: saldoRestante };
}

export async function reasignarPago(
  pagoId: string,
  nuevasAsignaciones: { registro_id: string }[],
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Desasignar todos los registros del pago
  await supabase
    .from("registros_trabajo")
    .update({ pago_id: null, facturado: false })
    .eq("pago_id", pagoId)
    .eq("user_id", user.id);

  // Asignar los nuevos
  if (nuevasAsignaciones.length > 0) {
    const ids = nuevasAsignaciones.map((a) => a.registro_id);
    await supabase
      .from("registros_trabajo")
      .update({ pago_id: pagoId, facturado: true })
      .in("id", ids)
      .eq("user_id", user.id);
  }
}
