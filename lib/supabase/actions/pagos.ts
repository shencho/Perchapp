"use server";

import { createClient } from "@/lib/supabase/server";
import { asignarPagoFIFO } from "@/lib/domain/asignarPagoFIFO";
import type { PagoCliente, RegistroTrabajo } from "@/types/supabase";
import type { MovimientoInput } from "@/lib/supabase/actions/movimientos-types";

export type PagoConCuenta = PagoCliente & {
  cuenta_nombre: string | null;
};

export interface RegistroConMontoPendiente {
  id:              string;
  fecha:           string;
  monto:           number;
  monto_pendiente: number;
  notas:           string | null;
}

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

export async function getDataPagoModal(clienteId: string): Promise<{
  registrosPendientes: RegistroConMontoPendiente[];
  saldoPendiente: number;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: registros, error: regError } = await supabase
    .from("registros_trabajo")
    .select("id, fecha, monto, notas")
    .eq("cliente_id", clienteId)
    .eq("user_id", user.id)
    .order("fecha");

  if (regError) throw new Error(regError.message);
  if (!registros || registros.length === 0) return { registrosPendientes: [], saldoPendiente: 0 };

  const registroIds = registros.map((r) => r.id);
  const { data: pivot, error: pivotError } = await supabase
    .from("registros_pagos")
    .select("registro_id, monto_asignado")
    .in("registro_id", registroIds)
    .eq("user_id", user.id);

  if (pivotError) throw new Error(pivotError.message);

  const montoCubierto = new Map<string, number>();
  for (const p of pivot ?? []) {
    montoCubierto.set(p.registro_id, (montoCubierto.get(p.registro_id) ?? 0) + p.monto_asignado);
  }

  const registrosPendientes: RegistroConMontoPendiente[] = [];
  let saldoPendiente = 0;

  for (const r of registros) {
    const cubierto = montoCubierto.get(r.id) ?? 0;
    const monto_pendiente = Math.max(0, (r.monto ?? 0) - cubierto);
    if (monto_pendiente > 0) {
      registrosPendientes.push({ id: r.id, fecha: r.fecha, monto: r.monto ?? 0, monto_pendiente, notas: r.notas });
      saldoPendiente += monto_pendiente;
    }
  }

  return { registrosPendientes, saldoPendiente };
}

export async function getPagoByMovimientoId(
  movimientoId: string,
): Promise<{ id: string; registro_creado_id: string | null } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data } = await supabase
    .from("pagos_cliente")
    .select("id, registro_creado_id")
    .eq("movimiento_id", movimientoId)
    .eq("user_id", user.id)
    .maybeSingle();

  return data ?? null;
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
  asignaciones: { registro_id: string; monto_asignado: number }[];
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

  // (d) Asignación FIFO usando registros_pagos como fuente de monto_pendiente
  const { registrosPendientes } = await getDataPagoModal(data.cliente_id);
  const { asignaciones, saldoRestante } = asignarPagoFIFO(registrosPendientes, data.monto);

  if (asignaciones.length > 0) {
    const ids = asignaciones.map((a) => a.registro_id);
    await supabase
      .from("registros_trabajo")
      .update({ pago_id: pago.id, facturado: true })
      .in("id", ids)
      .eq("user_id", user.id);

    await supabase.from("registros_pagos").insert(
      asignaciones.map((a) => ({
        user_id:        user.id,
        registro_id:    a.registro_id,
        pago_id:        pago.id,
        monto_asignado: a.monto_asignado,
      })),
    );
  }

  return { pago_id: pago.id, asignaciones, saldo_restante: saldoRestante };
}

export interface CreatePagoFromMovimientoInput {
  movimientoData:      MovimientoInput;
  cliente_id:          string;
  cliente_nombre:      string;
  registros_asignados: { registro_id: string; monto_asignado: number }[];
  registro_nuevo?: {
    servicio_id: string;
    fecha:       string;
    monto:       number;
    notas?:      string | null;
    tipo:        "sesion" | "hora" | "hito" | "comision";
  } | null;
}

export async function createPagoFromMovimiento(data: CreatePagoFromMovimientoInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const m = data.movimientoData;
  const today = new Date().toISOString().slice(0, 10);

  // 1. Insertar movimiento
  const { data: movimiento, error: movErr } = await supabase
    .from("movimientos")
    .insert({
      user_id:           user.id,
      tipo:              m.tipo,
      ambito:            m.ambito ?? "Profesional",
      monto:             m.monto,
      moneda:            m.moneda ?? "ARS",
      tipo_cambio:       m.tipo_cambio ?? null,
      concepto:          m.concepto ?? null,
      descripcion:       m.descripcion ?? null,
      categoria_id:      m.categoria_id ?? null,
      clasificacion:     m.clasificacion ?? "Variable",
      cuotas:            m.cuotas ?? 1,
      frecuencia:        m.frecuencia ?? "Corriente",
      necesidad:         m.necesidad ?? null,
      metodo:            m.metodo ?? null,
      cuenta_id:         m.cuenta_id ?? null,
      tarjeta_id:        m.tarjeta_id ?? null,
      fecha_vencimiento: m.fecha_vencimiento ?? null,
      debita_de:         m.debita_de ?? null,
      cuenta_destino_id: m.cuenta_destino_id ?? null,
      cantidad:          m.cantidad ?? 1,
      unitario:          m.unitario ?? null,
      observaciones:     m.observaciones ?? null,
      cliente_id:        data.cliente_id,
      servicio_id:       m.servicio_id ?? null,
      fecha:             m.fecha ?? today,
    })
    .select("id")
    .single();

  if (movErr || !movimiento) throw new Error(movErr?.message ?? "Error al crear movimiento");

  // 2. Insertar registro_nuevo si corresponde (CASO 2 y 3)
  let registroCreadoId: string | null = null;
  if (data.registro_nuevo) {
    const rn = data.registro_nuevo;
    const { data: regNuevo, error: regErr } = await supabase
      .from("registros_trabajo")
      .insert({
        user_id:         user.id,
        cliente_id:      data.cliente_id,
        servicio_id:     rn.servicio_id,
        tipo:            rn.tipo,
        fecha:           rn.fecha,
        cantidad:        1,
        tarifa_aplicada: null,
        monto:           rn.monto,
        monto_override:  true,
        origen:          "manual",
        notas:           rn.notas ?? null,
      })
      .select("id")
      .single();

    if (regErr || !regNuevo) throw new Error(regErr?.message ?? "Error al crear registro");
    registroCreadoId = regNuevo.id;
  }

  // 3. Insertar pago
  const { data: pago, error: pagoErr } = await supabase
    .from("pagos_cliente")
    .insert({
      user_id:            user.id,
      cliente_id:         data.cliente_id,
      fecha:              m.fecha ?? today,
      monto:              m.monto,
      moneda:             m.moneda ?? "ARS",
      metodo:             m.metodo ?? null,
      cuenta_destino_id:  m.cuenta_id ?? null,
      observaciones:      m.observaciones ?? null,
      movimiento_id:      movimiento.id,
      registro_creado_id: registroCreadoId,
    })
    .select("id")
    .single();

  if (pagoErr || !pago) throw new Error(pagoErr?.message ?? "Error al crear pago");

  // 4. Asignar registros + registro_nuevo al pago
  const todosAsignados: { registro_id: string; monto_asignado: number }[] = [
    ...data.registros_asignados,
    ...(registroCreadoId
      ? [{ registro_id: registroCreadoId, monto_asignado: data.registro_nuevo?.monto ?? 0 }]
      : []),
  ];

  if (todosAsignados.length > 0) {
    const ids = todosAsignados.map((a) => a.registro_id);
    await supabase
      .from("registros_trabajo")
      .update({ pago_id: pago.id, facturado: true })
      .in("id", ids)
      .eq("user_id", user.id);

    await supabase.from("registros_pagos").insert(
      todosAsignados.map((a) => ({
        user_id:        user.id,
        registro_id:    a.registro_id,
        pago_id:        pago.id,
        monto_asignado: a.monto_asignado,
      })),
    );
  }
}

export async function reasignarPago(
  pagoId: string,
  nuevasAsignaciones: { registro_id: string }[],
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // 1. Limpiar pivot + pago_id previos
  await supabase.from("registros_pagos").delete().eq("pago_id", pagoId).eq("user_id", user.id);
  await supabase
    .from("registros_trabajo")
    .update({ pago_id: null, facturado: false })
    .eq("pago_id", pagoId)
    .eq("user_id", user.id);

  if (nuevasAsignaciones.length === 0) return;

  const ids = nuevasAsignaciones.map((a) => a.registro_id);

  // 2. Obtener monto del pago
  const { data: pago } = await supabase
    .from("pagos_cliente")
    .select("monto")
    .eq("id", pagoId)
    .eq("user_id", user.id)
    .single();

  if (!pago) throw new Error("Pago no encontrado");

  // 3. Obtener montos de los registros + cobertura de otros pagos
  const [{ data: registros }, { data: cubiertos }] = await Promise.all([
    supabase.from("registros_trabajo").select("id, fecha, monto").in("id", ids).eq("user_id", user.id),
    supabase.from("registros_pagos").select("registro_id, monto_asignado").in("registro_id", ids).eq("user_id", user.id),
  ]);

  const montoCubierto = new Map<string, number>();
  for (const c of cubiertos ?? []) {
    montoCubierto.set(c.registro_id, (montoCubierto.get(c.registro_id) ?? 0) + c.monto_asignado);
  }

  const registrosParaFIFO = (registros ?? []).map((r) => ({
    id:              r.id,
    fecha:           r.fecha,
    monto_pendiente: Math.max(0, (r.monto ?? 0) - (montoCubierto.get(r.id) ?? 0)),
  }));

  // 4. FIFO + persistir
  const { asignaciones } = asignarPagoFIFO(registrosParaFIFO, pago.monto);

  if (asignaciones.length > 0) {
    const asignadosIds = asignaciones.map((a) => a.registro_id);
    await supabase
      .from("registros_trabajo")
      .update({ pago_id: pagoId, facturado: true })
      .in("id", asignadosIds)
      .eq("user_id", user.id);

    await supabase.from("registros_pagos").insert(
      asignaciones.map((a) => ({
        user_id:        user.id,
        registro_id:    a.registro_id,
        pago_id:        pagoId,
        monto_asignado: a.monto_asignado,
      })),
    );
  }
}

export async function syncPagoFromMovimiento(
  movimientoId: string,
  updates: { monto?: number; fecha?: string; cuenta_destino_id?: string | null },
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: pago } = await supabase
    .from("pagos_cliente")
    .select("id")
    .eq("movimiento_id", movimientoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!pago) return;

  const { error } = await supabase
    .from("pagos_cliente")
    .update(updates)
    .eq("id", pago.id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

export async function unlinkPagoFromMovimiento(movimientoId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: pago } = await supabase
    .from("pagos_cliente")
    .select("id, registro_creado_id")
    .eq("movimiento_id", movimientoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!pago) return;

  // Desasignar todos los registros del pago (incluye registro_creado si existe)
  await supabase
    .from("registros_trabajo")
    .update({ pago_id: null, facturado: false })
    .eq("pago_id", pago.id)
    .eq("user_id", user.id);

  // Eliminar registro_creado (fue generado automáticamente, queda huérfano si no lo borramos)
  if (pago.registro_creado_id) {
    await supabase
      .from("registros_trabajo")
      .delete()
      .eq("id", pago.registro_creado_id)
      .eq("user_id", user.id);
  }

  // Eliminar pago (sin tocar el movimiento)
  await supabase
    .from("pagos_cliente")
    .delete()
    .eq("id", pago.id)
    .eq("user_id", user.id);
}

export async function deletePagoFromMovimiento(movimientoId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: pago } = await supabase
    .from("pagos_cliente")
    .select("id, registro_creado_id")
    .eq("movimiento_id", movimientoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (pago) {
    // Desasignar registros
    await supabase
      .from("registros_trabajo")
      .update({ pago_id: null, facturado: false })
      .eq("pago_id", pago.id)
      .eq("user_id", user.id);

    // Eliminar registro_creado
    if (pago.registro_creado_id) {
      await supabase
        .from("registros_trabajo")
        .delete()
        .eq("id", pago.registro_creado_id)
        .eq("user_id", user.id);
    }

    // Eliminar pago
    await supabase
      .from("pagos_cliente")
      .delete()
      .eq("id", pago.id)
      .eq("user_id", user.id);
  }

  // Eliminar movimiento
  await supabase
    .from("movimientos")
    .delete()
    .eq("id", movimientoId)
    .eq("user_id", user.id);
}

export async function deletePago(pagoId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: pago } = await supabase
    .from("pagos_cliente")
    .select("movimiento_id, registro_creado_id")
    .eq("id", pagoId)
    .eq("user_id", user.id)
    .single();

  if (!pago) throw new Error("Pago no encontrado");

  // Desasignar registros
  await supabase
    .from("registros_trabajo")
    .update({ pago_id: null, facturado: false })
    .eq("pago_id", pagoId)
    .eq("user_id", user.id);

  // Eliminar registro_creado
  if (pago.registro_creado_id) {
    await supabase
      .from("registros_trabajo")
      .delete()
      .eq("id", pago.registro_creado_id)
      .eq("user_id", user.id);
  }

  // Eliminar pago
  await supabase
    .from("pagos_cliente")
    .delete()
    .eq("id", pagoId)
    .eq("user_id", user.id);

  // Eliminar movimiento vinculado (REGLA 4)
  if (pago.movimiento_id) {
    await supabase
      .from("movimientos")
      .delete()
      .eq("id", pago.movimiento_id)
      .eq("user_id", user.id);
  }
}
