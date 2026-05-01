"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularSaldoPrestamo } from "@/lib/domain/calcularSaldoPrestamo";
import {
  registrarPagoPrestamoSchema,
  editarPagoPrestamoSchema,
  type RegistrarPagoPrestamoInput,
  type EditarPagoPrestamoInput,
} from "./prestamos-types";
import type { PrestamoPago } from "@/types/supabase";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

// ── Tipo extendido ────────────────────────────────────────────────────────────

export type PrestamoPagoConMovimiento = PrestamoPago & {
  movimientos?: { id: string; cuenta_id: string | null } | null;
};

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getPagosPrestamo(prestamoId: string): Promise<PrestamoPagoConMovimiento[]> {
  const { supabase, userId } = await getAuthedUser();

  // Verificar que el préstamo pertenece al usuario
  const { error: authError } = await supabase
    .from("prestamos")
    .select("id")
    .eq("id", prestamoId)
    .eq("user_id", userId)
    .single();

  if (authError) throw new Error("Préstamo no encontrado");

  const { data, error } = await supabase
    .from("prestamos_pagos")
    .select("*, movimientos!movimiento_id(id, cuenta_id)")
    .eq("prestamo_id", prestamoId)
    .order("fecha", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PrestamoPagoConMovimiento[];
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function registrarPago(input: RegistrarPagoPrestamoInput): Promise<PrestamoPago> {
  const { supabase, userId } = await getAuthedUser();
  const parsed = registrarPagoPrestamoSchema.parse(input);

  // Fetch prestamo para tipo, moneda, y calcular saldo actual
  const { data: prestamo, error: prestamoError } = await supabase
    .from("prestamos")
    .select("*, prestamos_pagos(monto)")
    .eq("id", parsed.prestamoId)
    .eq("user_id", userId)
    .single();

  if (prestamoError || !prestamo) throw new Error("Préstamo no encontrado");

  const pagosExistentes = (prestamo.prestamos_pagos ?? []) as { monto: number }[];
  const { saldoPendiente } = calcularSaldoPrestamo(prestamo.monto_inicial, pagosExistentes);

  // Determinar nombre del concepto y tipo de movimiento
  let concepto: string;
  let tipoMovimiento: "Ingreso" | "Egreso";

  if (prestamo.tipo === "otorgado") {
    // Me devuelven → Ingreso
    tipoMovimiento = "Ingreso";
    const nombre = (prestamo as { personas?: { nombre: string } | null }).personas?.nombre ?? "persona";
    concepto = `Devolución préstamo — ${nombre}`;
  } else if (prestamo.tipo === "recibido") {
    // Devuelvo → Egreso
    tipoMovimiento = "Egreso";
    const nombre = (prestamo as { personas?: { nombre: string } | null }).personas?.nombre ?? "persona";
    concepto = `Pago préstamo — ${nombre}`;
  } else {
    // Bancario → Egreso (cuota)
    tipoMovimiento = "Egreso";
    const cuotaLabel = parsed.cuotaNumero ? ` cuota ${parsed.cuotaNumero}/${prestamo.cantidad_cuotas ?? "?"}` : "";
    concepto = `Cuota préstamo — ${prestamo.institucion_nombre ?? "institución"}${cuotaLabel}`;
  }

  // Crear movimiento vinculado
  const { data: movimiento, error: movError } = await supabase
    .from("movimientos")
    .insert({
      user_id: userId,
      tipo: tipoMovimiento,
      ambito: "Personal" as const,
      monto: parsed.monto,
      moneda: prestamo.moneda,
      fecha: parsed.fecha,
      concepto,
      cuenta_id: parsed.cuentaId ?? null,
      observaciones: parsed.notas ?? null,
    })
    .select("id")
    .single();

  if (movError || !movimiento) throw new Error(movError?.message ?? "Error al crear movimiento");

  // Insertar pago
  const { data: pago, error: pagoError } = await supabase
    .from("prestamos_pagos")
    .insert({
      prestamo_id: parsed.prestamoId,
      fecha: parsed.fecha,
      monto: parsed.monto,
      cuota_numero: parsed.cuotaNumero ?? null,
      movimiento_id: movimiento.id,
      notas: parsed.notas ?? null,
    })
    .select()
    .single();

  if (pagoError || !pago) throw new Error(pagoError?.message ?? "Error al registrar pago");

  // Vincular movimiento al préstamo y al pago
  await supabase
    .from("movimientos")
    .update({ prestamo_id: parsed.prestamoId, prestamo_pago_id: pago.id })
    .eq("id", movimiento.id);

  // Cancelar préstamo automáticamente si saldo <= 0 después del pago
  const nuevoSaldo = saldoPendiente - parsed.monto;
  if (nuevoSaldo <= 0 && prestamo.estado === "activo") {
    await supabase
      .from("prestamos")
      .update({ estado: "cancelado" })
      .eq("id", parsed.prestamoId);
  }

  return pago as PrestamoPago;
}

export async function editarPago(pagoId: string, input: EditarPagoPrestamoInput): Promise<PrestamoPago> {
  const { supabase, userId } = await getAuthedUser();
  const parsed = editarPagoPrestamoSchema.parse(input);

  // Fetch pago con prestamo para verificar ownership
  const { data: pago, error: fetchError } = await supabase
    .from("prestamos_pagos")
    .select("*, prestamos!inner(user_id)")
    .eq("id", pagoId)
    .single();

  if (fetchError || !pago) throw new Error("Pago no encontrado");
  const pagoTyped = pago as PrestamoPago & { prestamos: { user_id: string } };
  if (pagoTyped.prestamos.user_id !== userId) throw new Error("Sin permisos");

  // Actualizar pago
  const updateData: Partial<PrestamoPago> = {};
  if (parsed.fecha !== undefined) updateData.fecha = parsed.fecha;
  if (parsed.monto !== undefined) updateData.monto = parsed.monto;
  if (parsed.notas !== undefined) updateData.notas = parsed.notas;

  const { data: pagoActualizado, error: pagoError } = await supabase
    .from("prestamos_pagos")
    .update(updateData)
    .eq("id", pagoId)
    .select()
    .single();

  if (pagoError || !pagoActualizado) throw new Error(pagoError?.message ?? "Error al editar pago");

  // Sincronizar con movimiento vinculado
  if (pagoTyped.movimiento_id) {
    const movUpdate: Record<string, unknown> = {};
    if (parsed.monto !== undefined) movUpdate.monto = parsed.monto;
    if (parsed.fecha !== undefined) movUpdate.fecha = parsed.fecha;
    if (parsed.notas !== undefined) movUpdate.observaciones = parsed.notas;
    if (parsed.cuentaId !== undefined) movUpdate.cuenta_id = parsed.cuentaId;

    if (Object.keys(movUpdate).length > 0) {
      await supabase
        .from("movimientos")
        .update(movUpdate)
        .eq("id", pagoTyped.movimiento_id)
        .eq("user_id", userId);
    }
  }

  return pagoActualizado as PrestamoPago;
}

export async function eliminarPago(pagoId: string): Promise<void> {
  const { supabase, userId } = await getAuthedUser();

  // Fetch pago con prestamo para verificar ownership y obtener movimiento_id
  const { data: pago, error: fetchError } = await supabase
    .from("prestamos_pagos")
    .select("*, prestamos!inner(user_id, monto_inicial, estado)")
    .eq("id", pagoId)
    .single();

  if (fetchError || !pago) throw new Error("Pago no encontrado");
  const pagoTyped = pago as PrestamoPago & { prestamos: { user_id: string; monto_inicial: number; estado: string } };
  if (pagoTyped.prestamos.user_id !== userId) throw new Error("Sin permisos");

  // Eliminar movimiento vinculado primero (FK prestamo_pago_id se pone NULL por ON DELETE SET NULL)
  if (pagoTyped.movimiento_id) {
    await supabase
      .from("movimientos")
      .delete()
      .eq("id", pagoTyped.movimiento_id)
      .eq("user_id", userId);
  }

  // Eliminar pago
  const { error } = await supabase.from("prestamos_pagos").delete().eq("id", pagoId);
  if (error) throw new Error(error.message);

  // Si el préstamo estaba cancelado, reactivarlo (el pago que cerraba el saldo fue eliminado)
  if (pagoTyped.prestamos.estado === "cancelado") {
    await supabase
      .from("prestamos")
      .update({ estado: "activo" })
      .eq("id", pagoTyped.prestamo_id);
  }
}
