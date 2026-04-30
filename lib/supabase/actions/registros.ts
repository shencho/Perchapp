"use server";

import { createClient } from "@/lib/supabase/server";
import { calcularMontoRegistro } from "@/lib/domain/calcularMontoRegistro";
import type { RegistroTrabajo } from "@/types/supabase";

export type RegistroConServicio = RegistroTrabajo & {
  servicio_nombre: string | null;
};

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getRegistros(
  clienteId: string,
  mes?: number,
  anio?: number,
): Promise<RegistroConServicio[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  let query = supabase
    .from("registros_trabajo")
    .select("*, servicios_cliente(nombre)")
    .eq("cliente_id", clienteId)
    .eq("user_id", user.id)
    .order("fecha", { ascending: false });

  if (mes !== undefined && anio !== undefined) {
    const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const hasta = new Date(anio, mes, 0).toISOString().slice(0, 10);
    query = query.gte("fecha", desde).lte("fecha", hasta);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    ...r,
    servicio_nombre: (r.servicios_cliente as { nombre: string } | null)?.nombre ?? null,
  }));
}

export async function getRegistrosMes(
  servicioId: string,
  mes: number,
  anio: number,
): Promise<RegistroTrabajo[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const hasta  = new Date(anio, mes, 0).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("registros_trabajo")
    .select("*")
    .eq("servicio_id", servicioId)
    .eq("user_id", user.id)
    .gte("fecha", desde)
    .lte("fecha", hasta);

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Auto-cálculo de tarifa ────────────────────────────────────────────────────

export async function calcularTarifaParaRegistro(
  servicioId: string,
  clienteId: string,
  fecha: string,
  cantidad: number,
): Promise<{ tarifa_aplicada: number | null; monto: number; es_extra: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const fechaObj = new Date(fecha);
  const mes  = fechaObj.getMonth() + 1;
  const anio = fechaObj.getFullYear();

  const [servicioRes, historialRes, registrosMesRes] = await Promise.all([
    supabase.from("servicios_cliente").select("*").eq("id", servicioId).eq("user_id", user.id).single(),
    supabase.from("tarifas_historial").select("*").eq("servicio_id", servicioId).eq("user_id", user.id),
    supabase
      .from("registros_trabajo")
      .select("*")
      .eq("servicio_id", servicioId)
      .eq("user_id", user.id)
      .gte("fecha", `${anio}-${String(mes).padStart(2, "0")}-01`)
      .lte("fecha", new Date(anio, mes, 0).toISOString().slice(0, 10)),
  ]);

  if (!servicioRes.data) throw new Error("Servicio no encontrado");

  return calcularMontoRegistro({
    servicio:     servicioRes.data,
    historial:    historialRes.data ?? [],
    fecha,
    cantidad,
    registrosMes: registrosMesRes.data ?? [],
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export interface CreateRegistroInput {
  cliente_id:     string;
  servicio_id:    string;
  tipo:           "sesion" | "hora" | "hito" | "comision";
  fecha:          string;
  cantidad:       number;
  monto_override?: boolean;
  monto_manual?:  number | null;
  notas?:         string | null;
}

export async function createRegistro(data: CreateRegistroInput): Promise<{ warning?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  let tarifa_aplicada: number | null;
  let monto: number;

  if (data.tipo === "comision" || (data.monto_override && data.monto_manual != null)) {
    tarifa_aplicada = data.tipo === "comision" ? null : data.monto_manual! / data.cantidad;
    monto = data.monto_manual ?? 0;
  } else {
    const calc = await calcularTarifaParaRegistro(
      data.servicio_id,
      data.cliente_id,
      data.fecha,
      data.cantidad,
    );
    tarifa_aplicada = calc.tarifa_aplicada;
    monto = calc.monto;
  }

  const { error } = await supabase.from("registros_trabajo").insert({
    user_id:         user.id,
    cliente_id:      data.cliente_id,
    servicio_id:     data.servicio_id,
    tipo:            data.tipo,
    fecha:           data.fecha,
    cantidad:        data.cantidad,
    tarifa_aplicada,
    monto,
    monto_override:  data.tipo === "comision" ? true : !!data.monto_override,
    notas:           data.notas ?? null,
    origen:          "manual",
  });

  if (error) throw new Error(error.message);
  return {};
}

export interface UpdateRegistroInput {
  tipo?:           "sesion" | "hora" | "hito" | "comision";
  fecha?:          string;
  cantidad?:       number;
  monto_override?: boolean;
  monto?:          number | null;
  notas?:          string | null;
}

export async function updateRegistro(
  id: string,
  data: UpdateRegistroInput,
): Promise<{ warning?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Detectar si está vinculado a un pago para emitir warning
  const { data: actual } = await supabase
    .from("registros_trabajo")
    .select("pago_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase
    .from("registros_trabajo")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  const warning = actual?.pago_id
    ? "Este registro está vinculado a un pago. Los cambios no afectan al pago registrado."
    : undefined;

  return { warning };
}

export async function eliminarRegistro(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: registro } = await supabase
    .from("registros_trabajo")
    .select("pago_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (registro?.pago_id) {
    throw new Error("No se puede eliminar un registro que ya tiene un pago asignado. Primero desasignalo desde el tab Pagos.");
  }

  const { error } = await supabase
    .from("registros_trabajo")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}
