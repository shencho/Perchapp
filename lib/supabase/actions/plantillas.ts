"use server";

import { createClient } from "@/lib/supabase/server";
import type { PlantillaRecurrente } from "@/types/supabase";
import { toLocalISO, clampDay } from "@/lib/domain/_utils/dates";

export interface CreatePlantillaInput {
  nombre: string;
  monto_estimado: number;
  moneda: string;
  dia_mes: number;
  tipo?: "Egreso" | "Ingreso";
  ambito?: "Personal" | "Profesional";
  cliente_id?: string | null;
  servicio_id?: string | null;
  metodo?: PlantillaRecurrente["metodo"];
  debita_de?: "cuenta" | "tarjeta" | null;
  cuenta_id?: string | null;
  tarjeta_id?: string | null;
  categoria_id?: string | null;
  clasificacion?: PlantillaRecurrente["clasificacion"];
  concepto?: string | null;
  fecha_inicio?: string;
  fecha_fin?: string | null;
  notas?: string | null;
}

export type UpdatePlantillaInput = Partial<CreatePlantillaInput> & { activo?: boolean };

export async function getPlantillas(): Promise<PlantillaRecurrente[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("plantillas_recurrentes")
    .select("*")
    .eq("user_id", user.id)
    .order("dia_mes");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPlantilla(input: CreatePlantillaInput): Promise<PlantillaRecurrente> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("plantillas_recurrentes")
    .insert({ user_id: user.id, ...input })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Error al crear plantilla");
  return data;
}

export async function updatePlantilla(id: string, input: UpdatePlantillaInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("plantillas_recurrentes")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

export async function deactivatePlantilla(id: string): Promise<void> {
  return updatePlantilla(id, { activo: false });
}

export async function deletePlantilla(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { count } = await supabase
    .from("movimientos")
    .select("id", { count: "exact", head: true })
    .eq("plantilla_recurrente_id", id);

  if (count && count > 0) {
    throw new Error("Tiene movimientos generados. Desactivala en lugar de eliminarla.");
  }

  const { error } = await supabase
    .from("plantillas_recurrentes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

export async function buscarPlantillaParecida(input: {
  tipo:        "Egreso" | "Ingreso";
  concepto:    string | null;
  categoria_id: string | null;
  cuenta_id:   string | null;
  tarjeta_id:  string | null;
}): Promise<{ id: string; nombre: string } | null> {
  if (!input.concepto) return null;
  if (!input.cuenta_id && !input.tarjeta_id) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from("plantillas_recurrentes")
    .select("id, nombre")
    .eq("user_id", user.id)
    .eq("activo", true)
    .eq("tipo", input.tipo)
    .ilike("concepto", input.concepto)
    .limit(1);

  if (input.categoria_id) {
    query = query.eq("categoria_id", input.categoria_id);
  } else {
    query = query.is("categoria_id", null);
  }

  const orParts: string[] = [];
  if (input.cuenta_id)  orParts.push(`cuenta_id.eq.${input.cuenta_id}`);
  if (input.tarjeta_id) orParts.push(`tarjeta_id.eq.${input.tarjeta_id}`);
  query = query.or(orParts.join(","));

  const { data } = await query.maybeSingle();
  return data ?? null;
}

export interface GenerarMovimientoItem {
  plantillaId: string;
  monto: number;
  descripcion: string;
  fecha: string; // YYYY-MM-DD, pre-calculado con clamp
}

export async function generarMovimientosDePlantillas(
  items: GenerarMovimientoItem[],
): Promise<void> {
  if (items.length === 0) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const ids = items.map(i => i.plantillaId);
  const { data: plantillas, error: pErr } = await supabase
    .from("plantillas_recurrentes")
    .select("*")
    .in("id", ids)
    .eq("user_id", user.id);

  if (pErr || !plantillas) throw new Error(pErr?.message ?? "Error al cargar plantillas");

  const byId = Object.fromEntries(plantillas.map(p => [p.id, p]));

  const now = new Date();
  const rows = items.map(item => {
    const p = byId[item.plantillaId];
    if (!p) throw new Error(`Plantilla ${item.plantillaId} no encontrada`);

    // Use provided fecha (already clamped), but recalculate as safety fallback
    const fecha = item.fecha || toLocalISO(clampDay(now.getFullYear(), now.getMonth(), p.dia_mes));

    return {
      user_id:                 user.id,
      tipo:                    (p.tipo ?? "Egreso") as "Ingreso" | "Egreso",
      fecha,
      monto:                   item.monto,
      descripcion:             item.descripcion || null,
      moneda:                  p.moneda,
      metodo:                  p.metodo,
      debita_de:               p.debita_de,
      cuenta_id:               p.cuenta_id,
      tarjeta_id:              p.tarjeta_id,
      categoria_id:            p.categoria_id,
      clasificacion:           p.clasificacion ?? "Fijo",
      concepto:                p.concepto ?? null,
      ambito:                  (p.ambito ?? "Personal") as "Personal" | "Profesional",
      cliente_id:              p.cliente_id ?? null,
      servicio_id:             p.servicio_id ?? null,
      frecuencia:              "Corriente" as const,
      plantilla_recurrente_id: p.id,
    };
  });

  const { error } = await supabase.from("movimientos").insert(rows);
  if (error) throw new Error(error.message);
}
