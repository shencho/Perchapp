"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DeudaCompartida } from "@/types/supabase";

async function getAuthed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, userId: user.id };
}

const ACTIVAS = ["pendiente", "pago_marcado", "confirmada"];

/** Deudas donde soy el deudor (le debo a alguien). */
export async function getDeudasComoDeudor(): Promise<DeudaCompartida[]> {
  const { supabase, userId } = await getAuthed();
  const { data, error } = await supabase
    .from("deudas_compartidas")
    .select("*")
    .eq("deudor_id", userId)
    .in("estado", ACTIVAS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Deudas donde soy el acreedor (me deben). */
export async function getDeudasComoAcreedor(): Promise<DeudaCompartida[]> {
  const { supabase, userId } = await getAuthed();
  const { data, error } = await supabase
    .from("deudas_compartidas")
    .select("*")
    .eq("acreedor_id", userId)
    .in("estado", ACTIVAS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

function revalidar() {
  revalidatePath("/balances");
  revalidatePath("/gastos-compartidos");
  revalidatePath("/", "layout"); // refresca la campana
}

/** Deudor: marca que pagó (opcionalmente indica de qué cuenta salió). */
export async function marcarDeudaPagada(input: {
  deudaId: string;
  cuentaId?: string | null;
}): Promise<void> {
  const { supabase, userId } = await getAuthed();
  const { error } = await supabase
    .from("deudas_compartidas")
    .update({ estado: "pago_marcado", deudor_cuenta_id: input.cuentaId ?? null })
    .eq("id", input.deudaId)
    .eq("deudor_id", userId);
  if (error) throw new Error(error.message);
  revalidar();
}

/** Deudor: rechaza la deuda. */
export async function rechazarDeuda(deudaId: string): Promise<void> {
  const { supabase, userId } = await getAuthed();
  const { error } = await supabase
    .from("deudas_compartidas")
    .update({ estado: "rechazada", responded_at: new Date().toISOString() })
    .eq("id", deudaId)
    .eq("deudor_id", userId);
  if (error) throw new Error(error.message);
  revalidar();
}

/** Acreedor: confirma que recibió el pago → crea los movimientos de ambos lados. */
export async function confirmarDeuda(input: {
  deudaId: string;
  cuentaDestinoId: string | null;
  fecha: string;
  observacion?: string | null;
}): Promise<void> {
  const { supabase } = await getAuthed();
  const { error } = await supabase.rpc("conciliar_deuda", {
    p_deuda_id: input.deudaId,
    p_acreedor_cuenta_id: input.cuentaDestinoId,
    p_fecha: input.fecha,
    p_observacion: input.observacion ?? null,
  });
  if (error) throw new Error(error.message);
  revalidar();
}

/** Acreedor: revierte una conciliación (borra los movimientos, vuelve a pago_marcado). */
export async function revertirDeuda(deudaId: string): Promise<void> {
  const { supabase } = await getAuthed();
  const { error } = await supabase.rpc("revertir_conciliacion", {
    p_deuda_id: deudaId,
  });
  if (error) throw new Error(error.message);
  revalidar();
}
