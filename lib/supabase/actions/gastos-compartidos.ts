"use server";

import { createClient } from "@/lib/supabase/server";
import type { GastoCompartidoParticipante } from "@/types/supabase";
import type { ParticipanteInput, MarcarCobradoInput, PagadorFormInput, GastoGrupalPagadorRow } from "./gastos-compartidos-types";
import { calcularBalanceGrupal } from "@/lib/domain/calcularBalanceGrupal";
import type { ResultadoBalanceGrupal, PagadorInput, ParticipanteConsumoInput } from "@/lib/domain/calcularBalanceGrupal";

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
        modo:             p.modo ?? "a_repartir",
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
      es_reembolso:  true,
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

// ── Splitwise: múltiples pagadores ───────────────────────────────────────────

/**
 * Devuelve los pagadores registrados para un gasto.
 * Array vacío = gasto legacy (el usuario pagó todo, retrocompatibilidad).
 */
export async function getPagadores(gastoId: string): Promise<GastoGrupalPagadorRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("gastos_grupales_pagadores")
    .select("id, persona_id, monto_pagado")
    .eq("gasto_id", gastoId)
    .eq("user_id", user.id)
    .order("created_at");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Reemplaza todos los pagadores de un gasto en bulk (DELETE + INSERT).
 * Pasar array vacío borra los pagadores (vuelve a retrocompatibilidad).
 */
export async function upsertPagadores(
  gastoId: string,
  pagadores: PagadorFormInput[],
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Eliminar todos los pagadores existentes del gasto
  const { error: delError } = await supabase
    .from("gastos_grupales_pagadores")
    .delete()
    .eq("gasto_id", gastoId)
    .eq("user_id", user.id);

  if (delError) throw new Error(delError.message);
  if (pagadores.length === 0) return;

  const { error: insError } = await supabase
    .from("gastos_grupales_pagadores")
    .insert(
      pagadores.map(p => ({
        user_id:      user.id,
        gasto_id:     gastoId,
        persona_id:   p.personaId,
        monto_pagado: p.montoPagado,
      })),
    );

  if (insError) throw new Error(insError.message);
}

/**
 * Calcula el balance grupal de un gasto: combina pagadores + participantes
 * y devuelve balances netos y transferencias mínimas.
 *
 * @param gastoId   - ID del movimiento compartido
 * @param montoGasto - Monto total del gasto (fallback retrocompatibilidad)
 * @param nombreUsuario - Nombre del usuario para el slot personaId=null
 */
export async function getBalanceGasto(
  gastoId: string,
  montoGasto: number,
  nombreUsuario = "Vos",
): Promise<ResultadoBalanceGrupal> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Cargar pagadores, participantes y gc_mi_parte (retrocompat) en paralelo
  const [pagadoresRows, participantesRows, movRow] = await Promise.all([
    getPagadores(gastoId),
    getParticipantes(gastoId),
    supabase.from("movimientos").select("gc_mi_parte").eq("id", gastoId).eq("user_id", user.id).single(),
  ]);

  // Mapear a tipos del dominio
  // Para los nombres de pagadores, necesitamos las personas
  // Los nombres ya están disponibles en participantes (persona_nombre)
  // Para pagadores usamos "Vos" para null y buscamos en participantes para los demás
  const nombrePorPersonaId = new Map<string, string>()
  for (const p of participantesRows) {
    if (p.persona_id) nombrePorPersonaId.set(p.persona_id, p.persona_nombre)
  }

  const pagadoresInput: PagadorInput[] = pagadoresRows.map(p => ({
    personaId:   p.persona_id,
    nombre:      p.persona_id ? (nombrePorPersonaId.get(p.persona_id) ?? "Persona") : nombreUsuario,
    montoPagado: p.monto_pagado,
  }))

  const participantesInput: ParticipanteConsumoInput[] = participantesRows.map(p => ({
    personaId:      p.persona_id,
    nombre:         p.persona_id === null ? nombreUsuario : p.persona_nombre,
    montoConsumido: p.monto,
  }))

  // Retrocompat: gastos viejos guardan consumo del usuario en gc_mi_parte, no en participantes
  const hasUserParticipant = participantesRows.some(p => p.persona_id === null)
  const gcMiParteVal = movRow.data?.gc_mi_parte ?? null
  if (!hasUserParticipant && gcMiParteVal && gcMiParteVal > 0) {
    participantesInput.push({
      personaId:      null,
      nombre:         nombreUsuario,
      montoConsumido: gcMiParteVal,
    })
  }

  return calcularBalanceGrupal(pagadoresInput, participantesInput, montoGasto, nombreUsuario)
}

/**
 * Salda toda la deuda pendiente de una persona en una moneda dada:
 * crea 1 movimiento Ingreso por el total y marca todos sus participantes pendientes como cobrados.
 */
export async function saldarTodoPersona(input: {
  personaId: string;
  moneda: string;
  cuentaDestinoId: string | null;
  fecha: string;
  observacion: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Obtener IDs de gastos compartidos del usuario en la moneda indicada
  const { data: gastosRows } = await supabase
    .from("movimientos")
    .select("id, concepto")
    .eq("user_id", user.id)
    .eq("es_compartido", true)
    .eq("moneda", input.moneda);

  const gastoIds = (gastosRows ?? []).map((g) => g.id);
  if (gastoIds.length === 0) return;

  // Participantes pendientes de esta persona en esos gastos
  const { data: pendientes } = await supabase
    .from("gastos_compartidos_participantes")
    .select("id, monto")
    .eq("persona_id", input.personaId)
    .eq("user_id", user.id)
    .eq("estado", "pendiente")
    .in("movimiento_id", gastoIds);

  if (!pendientes || pendientes.length === 0) return;

  const totalMonto = pendientes.reduce((acc, p) => acc + p.monto, 0);

  // Nombre de la persona para el concepto
  const { data: personaData } = await supabase
    .from("personas")
    .select("nombre")
    .eq("id", input.personaId)
    .single();
  const nombrePersona = personaData?.nombre ?? "Persona";

  // Crear movimiento Ingreso
  const { data: mov, error: movErr } = await supabase
    .from("movimientos")
    .insert({
      user_id:       user.id,
      tipo:          "Ingreso",
      ambito:        "Personal",
      monto:         totalMonto,
      moneda:        input.moneda,
      concepto:      `Saldo consolidado con ${nombrePersona}`,
      fecha:         input.fecha,
      cuenta_id:     input.cuentaDestinoId ?? null,
      observaciones: input.observacion ?? null,
      clasificacion: "Variable",
      cuotas:        1,
      frecuencia:    "Corriente",
      cantidad:      1,
      es_reembolso:  true,
    })
    .select("id")
    .single();

  if (movErr || !mov) throw new Error(movErr?.message ?? "Error al crear movimiento");

  // Marcar todos los participantes como cobrados
  const { error: updErr } = await supabase
    .from("gastos_compartidos_participantes")
    .update({
      estado:                "cobrado",
      movimiento_ingreso_id: mov.id,
      cuenta_destino_id:     input.cuentaDestinoId ?? null,
    })
    .in("id", pendientes.map((p) => p.id))
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
