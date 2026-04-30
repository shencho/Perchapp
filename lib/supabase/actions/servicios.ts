"use server";

import { createClient } from "@/lib/supabase/server";
import type { ServicioCliente, TarifaHistorial } from "@/types/supabase";

export type ServicioConHistorial = ServicioCliente & {
  tarifas_historial: TarifaHistorial[];
};

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getServicios(clienteId: string): Promise<ServicioConHistorial[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const [serviciosRes, historialRes] = await Promise.all([
    supabase
      .from("servicios_cliente")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("tarifas_historial")
      .select("*")
      .eq("user_id", user.id)
      .order("vigente_desde", { ascending: false }),
  ]);

  const servicios = serviciosRes.data ?? [];
  const historial = historialRes.data ?? [];

  return servicios.map((s) => ({
    ...s,
    tarifas_historial: historial.filter((h) => h.servicio_id === s.id),
  }));
}

export async function getTarifasHistorial(servicioId: string): Promise<TarifaHistorial[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("tarifas_historial")
    .select("*")
    .eq("servicio_id", servicioId)
    .eq("user_id", user.id)
    .order("vigente_desde", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Mutations ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export interface CreateServicioInput {
  cliente_id: string;
  nombre: string;
  modalidad: "sesion" | "hora" | "abono" | "proyecto";
  tarifa_actual?: number | null;
  tarifa_moneda?: string;
  ciclo_facturacion?: "mensual" | "quincenal" | "al_cierre" | "por_hito" | "inmediato";
  dia_cierre_ciclo?: number | null;
  tope_unidades_periodo?: number | null;
  tarifa_unidad_extra?: number | null;
  proyecto_total?: number | null;
  proyecto_estado?: "activo" | "finalizado" | "pausado";
  notas?: string | null;
}

export async function createServicio(data: CreateServicioInput): Promise<ServicioCliente> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: servicio, error } = await supabase
    .from("servicios_cliente")
    .insert({
      user_id:               user.id,
      cliente_id:            data.cliente_id,
      nombre:                data.nombre,
      modalidad:             data.modalidad,
      tarifa_actual:         data.tarifa_actual ?? null,
      tarifa_moneda:         data.tarifa_moneda ?? "ARS",
      ciclo_facturacion:     data.ciclo_facturacion ?? "mensual",
      dia_cierre_ciclo:      data.dia_cierre_ciclo ?? null,
      tope_unidades_periodo: data.tope_unidades_periodo ?? null,
      tarifa_unidad_extra:   data.tarifa_unidad_extra ?? null,
      proyecto_total:        data.proyecto_total ?? null,
      proyecto_estado:       data.proyecto_estado ?? "activo",
      notas:                 data.notas ?? null,
    })
    .select()
    .single();

  if (error || !servicio) throw new Error(error?.message ?? "Error al crear servicio");

  // Insertar primera entrada en tarifas_historial si hay tarifa
  if (data.tarifa_actual != null) {
    await supabase.from("tarifas_historial").insert({
      user_id:       user.id,
      servicio_id:   servicio.id,
      tarifa:        data.tarifa_actual,
      moneda:        data.tarifa_moneda ?? "ARS",
      vigente_desde: todayStr(),
      vigente_hasta: null,
    });
  }

  return servicio;
}

export interface UpdateServicioInput {
  nombre?: string;
  modalidad?: "sesion" | "hora" | "abono" | "proyecto";
  tarifa_actual?: number | null;
  tarifa_moneda?: string;
  ciclo_facturacion?: "mensual" | "quincenal" | "al_cierre" | "por_hito" | "inmediato";
  dia_cierre_ciclo?: number | null;
  tope_unidades_periodo?: number | null;
  tarifa_unidad_extra?: number | null;
  proyecto_total?: number | null;
  proyecto_estado?: "activo" | "finalizado" | "pausado";
  notas?: string | null;
}

export async function updateServicio(id: string, data: UpdateServicioInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Leer tarifa actual para detectar si cambió
  const { data: actual } = await supabase
    .from("servicios_cliente")
    .select("tarifa_actual, tarifa_moneda")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const tarifaCambio =
    data.tarifa_actual !== undefined &&
    (data.tarifa_actual !== actual?.tarifa_actual ||
      (data.tarifa_moneda && data.tarifa_moneda !== actual?.tarifa_moneda));

  if (tarifaCambio && data.tarifa_actual != null) {
    // Cerrar entrada vigente (vigente_hasta = ayer)
    await supabase
      .from("tarifas_historial")
      .update({ vigente_hasta: yesterdayStr() })
      .eq("servicio_id", id)
      .eq("user_id", user.id)
      .is("vigente_hasta", null);

    // Crear nueva entrada
    await supabase.from("tarifas_historial").insert({
      user_id:       user.id,
      servicio_id:   id,
      tarifa:        data.tarifa_actual,
      moneda:        data.tarifa_moneda ?? actual?.tarifa_moneda ?? "ARS",
      vigente_desde: todayStr(),
      vigente_hasta: null,
    });
  }

  const { error } = await supabase
    .from("servicios_cliente")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

export async function archivarServicio(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("servicios_cliente")
    .update({ archivado: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}
