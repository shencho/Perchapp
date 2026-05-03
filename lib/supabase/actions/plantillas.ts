"use server";

import { createClient } from "@/lib/supabase/server";
import type { PlantillaRecurrente } from "@/types/supabase";
import { toLocalISO, clampDay } from "@/lib/domain/_utils/dates";

export interface CreatePlantillaInput {
  nombre: string;
  monto_estimado: number;
  moneda: string;
  dia_mes: number;
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
      tipo:                    "Egreso" as const,
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
      ambito:                  "Personal" as const,
      frecuencia:              "Corriente" as const,
      plantilla_recurrente_id: p.id,
    };
  });

  const { error } = await supabase.from("movimientos").insert(rows);
  if (error) throw new Error(error.message);
}
