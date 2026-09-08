"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PlantillaRecurrente } from "@/types/supabase";
import { toLocalISO, clampDay } from "@/lib/domain/_utils/dates";

export interface CreatePlantillaInput {
  nombre: string;
  monto_estimado: number;
  moneda: string;
  dia_mes: number;
  tipo?: "Egreso" | "Ingreso";
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
  // Campos que la plantilla no guardaba y hacían que el movimiento generado no
  // fuera el mismo gasto (migración 035).
  ambito?: "Personal" | "Profesional";
  descripcion?: string | null;
  observaciones?: string | null;
  necesidad?: number | null;
  cantidad?: number;
  frecuencia?: "Corriente" | "No corriente";
  es_compartido?: boolean;
  gc_mi_parte?: number | null;
  /** Repartición a replicar cada mes. Reemplaza en bloque a la anterior. */
  participantes?: {
    persona_nombre: string;
    persona_id?: string | null;
    monto: number;
    modo?: "fijo" | "a_repartir";
  }[];
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

  // `participantes` no es columna de la tabla: va aparte. Sin separarlo, el
  // insert entero falla.
  const { participantes, ...columnas } = input;

  const { data, error } = await supabase
    .from("plantillas_recurrentes")
    .insert({ user_id: user.id, ...columnas })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Error al crear plantilla");

  await guardarParticipantes(data.id, participantes);
  revalidatePath("/movimientos-recurrentes");
  return data;
}

/**
 * Reemplaza en bloque la repartición de una plantilla.
 *
 * Se borra y se reinserta en vez de actualizar fila por fila: los participantes
 * no tienen identidad estable entre ediciones (una persona puede salir y entrar),
 * y el borrado en bloque evita quedarse con filas huérfanas de un reparto viejo.
 */
async function guardarParticipantes(
  plantillaId: string,
  participantes: CreatePlantillaInput["participantes"],
): Promise<void> {
  if (participantes === undefined) return; // no se tocó el reparto

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await supabase.from("plantilla_participantes")
    .delete().eq("plantilla_id", plantillaId).eq("user_id", user.id);

  if (!participantes.length) return;

  const { error } = await supabase.from("plantilla_participantes").insert(
    participantes.map((p) => ({
      user_id:        user.id,
      plantilla_id:   plantillaId,
      persona_nombre: p.persona_nombre,
      persona_id:     p.persona_id ?? null,
      monto:          p.monto,
      modo:           p.modo ?? "a_repartir",
    })),
  );
  if (error) throw new Error(error.message);
}

/** Repartición guardada de una plantilla, para precargar el editor. */
export async function getParticipantesPlantilla(plantillaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("plantilla_participantes")
    .select("persona_nombre, persona_id, monto, modo")
    .eq("plantilla_id", plantillaId)
    .eq("user_id", user.id);
  return data ?? [];
}

export async function updatePlantilla(id: string, input: UpdatePlantillaInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { participantes, ...columnas } = input;

  const { error } = await supabase
    .from("plantillas_recurrentes")
    .update(columnas)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  await guardarParticipantes(id, participantes);
  revalidatePath("/movimientos-recurrentes");
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
  revalidatePath("/movimientos-recurrentes");
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
      descripcion:             item.descripcion || p.descripcion || null,
      moneda:                  p.moneda,
      metodo:                  p.metodo,
      debita_de:               p.debita_de,
      cuenta_id:               p.cuenta_id,
      tarjeta_id:              p.tarjeta_id,
      categoria_id:            p.categoria_id,
      clasificacion:           p.clasificacion ?? "Fijo",
      concepto:                p.concepto ?? null,
      // Antes esto era `"Corriente"` fijo, sin mirar el original: una cuota o un
      // gasto no corriente convertido en plantilla se regeneraba como corriente
      // y el cash-flow lo proyectaba para siempre.
      frecuencia:              (p.frecuencia ?? "Corriente") as "Corriente" | "No corriente",
      ambito:                  p.ambito ?? "Personal",
      observaciones:           p.observaciones ?? null,
      necesidad:               p.necesidad ?? null,
      cantidad:                p.cantidad ?? 1,
      es_compartido:           p.es_compartido ?? false,
      gc_mi_parte:             p.gc_mi_parte ?? null,
      plantilla_recurrente_id: p.id,
    };
  });

  // `select("id")` para poder colgarle los participantes a cada movimiento nuevo.
  const { data: creados, error } = await supabase
    .from("movimientos").insert(rows).select("id, plantilla_recurrente_id");
  if (error) throw new Error(error.message);

  // Replicar la repartición del gasto compartido. Sin esto, una plantilla de un
  // gasto compartido generaba un gasto entero NO compartido y se perdía la
  // deuda de los demás.
  const idsCompartidas = plantillas.filter(p => p.es_compartido).map(p => p.id);
  if (idsCompartidas.length && creados?.length) {
    const { data: participantes } = await supabase
      .from("plantilla_participantes")
      .select("plantilla_id, persona_nombre, persona_id, monto, modo")
      .eq("user_id", user.id)
      .in("plantilla_id", idsCompartidas);

    const filas = (creados ?? []).flatMap(mov =>
      (participantes ?? [])
        .filter(pp => pp.plantilla_id === mov.plantilla_recurrente_id)
        .map(pp => ({
          user_id:        user.id,
          movimiento_id:  mov.id,
          persona_nombre: pp.persona_nombre,
          persona_id:     pp.persona_id,
          monto:          pp.monto,
          modo:           pp.modo,
          // La plantilla describe el reparto, no el cobro: cada mes arranca
          // pendiente de cobrar.
          estado:         "pendiente" as const,
        })),
    );
    if (filas.length) {
      const { error: eParts } = await supabase
        .from("gastos_compartidos_participantes").insert(filas);
      if (eParts) throw new Error(eParts.message);
    }
  }
}
