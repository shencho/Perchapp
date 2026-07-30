"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Conexion } from "@/types/supabase";
import type { ConexionVista } from "./conexiones-types";

// Mapea una fila de conexiones a la vista del usuario actual (resuelve "el otro").
function toVista(row: Conexion, userId: string): ConexionVista {
  const soySolicitante = row.solicitante_id === userId;
  return {
    id: row.id,
    estado: row.estado as ConexionVista["estado"],
    soySolicitante,
    otroNombre: soySolicitante ? row.receptor_nombre : row.solicitante_nombre,
    otroId: soySolicitante ? row.receptor_id : row.solicitante_id,
    mensaje: row.mensaje,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

async function getAuthed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, userId: user.id };
}

/**
 * Busca un usuario por email exacto vía RPC SECURITY DEFINER.
 * No expone profiles como directorio: devuelve solo {id, nombre} o null.
 */
export async function buscarUsuarioPorEmail(
  email: string,
): Promise<{ id: string; nombre: string | null } | null> {
  const clean = email.trim();
  if (!clean) return null;
  const { supabase } = await getAuthed();

  const { data, error } = await supabase.rpc("buscar_usuario_por_email", {
    p_email: clean,
  });
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { id: row.id as string, nombre: (row.nombre as string | null) ?? null };
}

/** Conexiones aceptadas del usuario actual. */
export async function getConexiones(): Promise<ConexionVista[]> {
  const { supabase, userId } = await getAuthed();
  const { data, error } = await supabase
    .from("conexiones")
    .select("*")
    .eq("estado", "aceptada")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toVista(row, userId));
}

/** Invitaciones pendientes, separadas en recibidas y enviadas. */
export async function getInvitacionesPendientes(): Promise<{
  recibidas: ConexionVista[];
  enviadas: ConexionVista[];
}> {
  const { supabase, userId } = await getAuthed();
  const { data, error } = await supabase
    .from("conexiones")
    .select("*")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const vistas = (data ?? []).map((row) => toVista(row, userId));
  return {
    recibidas: vistas.filter((v) => !v.soySolicitante),
    enviadas: vistas.filter((v) => v.soySolicitante),
  };
}

/**
 * Envía una invitación de conexión a un usuario existente.
 * Guarda snapshots de ambos nombres para no leer profiles ajeno luego.
 * `receptorNombre` viene del resultado de `buscarUsuarioPorEmail` en el cliente.
 */
export async function enviarInvitacion(
  receptorId: string,
  receptorNombre?: string | null,
  mensaje?: string,
): Promise<void> {
  const { supabase, userId } = await getAuthed();
  if (receptorId === userId) throw new Error("No podés conectarte con vos mismo");

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("nombre")
    .eq("id", userId)
    .single();

  const { error } = await supabase.from("conexiones").insert({
    solicitante_id: userId,
    receptor_id: receptorId,
    solicitante_nombre: miPerfil?.nombre ?? null,
    receptor_nombre: receptorNombre ?? null,
    estado: "pendiente",
    mensaje: mensaje?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya tenés una conexión con esta persona");
    }
    throw new Error(error.message);
  }
  revalidatePath("/personas");
}

/** Acepta o rechaza una invitación recibida. Marca su notificación como leída. */
export async function responderInvitacion(
  conexionId: string,
  aceptar: boolean,
): Promise<void> {
  const { supabase, userId } = await getAuthed();

  const { error } = await supabase
    .from("conexiones")
    .update({
      estado: aceptar ? "aceptada" : "rechazada",
      responded_at: new Date().toISOString(),
    })
    .eq("id", conexionId)
    .eq("receptor_id", userId);
  if (error) throw new Error(error.message);

  // Marca como leída la notificación asociada (si existe).
  await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("user_id", userId)
    .eq("ref_id", conexionId);

  revalidatePath("/personas");
}

/** Elimina una conexión (invitación o aceptada). Cualquiera de las dos partes puede. */
export async function eliminarConexion(conexionId: string): Promise<void> {
  const { supabase, userId } = await getAuthed();
  const { error } = await supabase
    .from("conexiones")
    .delete()
    .eq("id", conexionId)
    .or(`solicitante_id.eq.${userId},receptor_id.eq.${userId}`);
  if (error) throw new Error(error.message);
  revalidatePath("/personas");
}
