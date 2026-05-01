"use server";

import { createClient } from "@/lib/supabase/server";
import type { GastoCompartidoParticipante } from "@/types/supabase";
import type { ParticipanteInput, MarcarCobradoInput } from "./gastos-compartidos-types";

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getParticipantes(
  movimientoId: string,
): Promise<GastoCompartidoParticipante[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("gastos_compartidos_participantes")
    .select("*")
    .eq("movimiento_id", movimientoId)
    .eq("user_id", user.id)
    .order("created_at");

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Reemplaza todos los participantes de un movimiento en bulk.
 * Se llama al guardar el movimiento (crear o editar).
 * Solo toca participantes pendientes; los cobrados se preservan si el id existe.
 */
export async function upsertParticipantes(
  movimientoId: string,
  participantes: ParticipanteInput[],
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Preservar cobrados (tienen movimiento_ingreso_id)
  const { data: existentes } = await supabase
    .from("gastos_compartidos_participantes")
    .select("id, estado")
    .eq("movimiento_id", movimientoId)
    .eq("user_id", user.id);

  const cobradosIds = (existentes ?? [])
    .filter((p) => p.estado === "cobrado")
    .map((p) => p.id);

  // Eliminar solo los pendientes
  if (cobradosIds.length > 0) {
    await supabase
      .from("gastos_compartidos_participantes")
      .delete()
      .eq("movimiento_id", movimientoId)
      .eq("user_id", user.id)
      .eq("estado", "pendiente");
  } else {
    await supabase
      .from("gastos_compartidos_participantes")
      .delete()
      .eq("movimiento_id", movimientoId)
      .eq("user_id", user.id);
  }

  if (participantes.length === 0) return;

  const { error } = await supabase
    .from("gastos_compartidos_participantes")
    .insert(
      participantes.map((p) => ({
        user_id:          user.id,
        movimiento_id:    movimientoId,
        persona_nombre:   p.persona_nombre,
        persona_id:       p.persona_id ?? null,
        monto:            p.monto,
        estado:           "pendiente" as const,
        cuenta_destino_id: p.cuenta_destino_id ?? null,
      })),
    );

  if (error) throw new Error(error.message);
}

/**
 * Marca un participante como cobrado y crea el movimiento Ingreso vinculado.
 */
export async function marcarCobrado(input: MarcarCobradoInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: participante } = await supabase
    .from("gastos_compartidos_participantes")
    .select("id, persona_nombre, monto, movimiento_id")
    .eq("id", input.participanteId)
    .eq("user_id", user.id)
    .single();

  if (!participante) throw new Error("Participante no encontrado");

  // Crear movimiento Ingreso
  const concepto = `Reembolso de ${participante.persona_nombre} por ${input.conceptoGasto || "gasto compartido"}`;

  const { data: mov, error: movErr } = await supabase
    .from("movimientos")
    .insert({
      user_id:       user.id,
      tipo:          "Ingreso",
      ambito:        "Personal",
      monto:         participante.monto,
      moneda:        input.moneda,
      concepto,
      fecha:         input.fecha,
      cuenta_id:     input.cuentaDestinoId ?? null,
      observaciones: input.observacion ?? null,
      clasificacion: "Variable",
      cuotas:        1,
      frecuencia:    "Corriente",
      cantidad:      1,
    })
    .select("id")
    .single();

  if (movErr || !mov) throw new Error(movErr?.message ?? "Error al crear movimiento de reembolso");

  // Actualizar participante
  const { error: updErr } = await supabase
    .from("gastos_compartidos_participantes")
    .update({
      estado:               "cobrado",
      cuenta_destino_id:    input.cuentaDestinoId ?? null,
      movimiento_ingreso_id: mov.id,
    })
    .eq("id", input.participanteId)
    .eq("user_id", user.id);

  if (updErr) throw new Error(updErr.message);
}

/**
 * Destilda cobrado: elimina el movimiento Ingreso vinculado y resetea el participante.
 */
export async function marcarPendiente(participanteId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: participante } = await supabase
    .from("gastos_compartidos_participantes")
    .select("movimiento_ingreso_id")
    .eq("id", participanteId)
    .eq("user_id", user.id)
    .single();

  if (!participante) throw new Error("Participante no encontrado");

  // Eliminar movimiento ingreso vinculado
  if (participante.movimiento_ingreso_id) {
    await supabase
      .from("movimientos")
      .delete()
      .eq("id", participante.movimiento_ingreso_id)
      .eq("user_id", user.id);
  }

  // Resetear participante
  const { error } = await supabase
    .from("gastos_compartidos_participantes")
    .update({ estado: "pendiente", movimiento_ingreso_id: null })
    .eq("id", participanteId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}
