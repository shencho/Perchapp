"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  movimientoSchema,
  type MovimientoInput,
  type MovimientosFiltros,
} from "./movimientos-types";

async function getAuthedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function getMovimientos(filtros: MovimientosFiltros = {}) {
  const { supabase, userId } = await getAuthedUser();

  const PAGE_SIZE = 25;
  const pagina = filtros.pagina ?? 0;
  const desde = pagina * PAGE_SIZE;
  const hasta = desde + PAGE_SIZE - 1;

  let query = supabase
    .from("movimientos")
    .select(`
      *,
      categorias ( id, nombre, tipo, parent_id ),
      cuentas:cuenta_id ( id, nombre, tipo ),
      cuenta_destino:cuenta_destino_id ( id, nombre ),
      tarjetas:tarjeta_id ( id, nombre ),
      clientes:cliente_id ( id, nombre ),
      servicios_cliente:servicio_id ( id, nombre )
    `, { count: "exact" })
    .eq("user_id", userId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .range(desde, hasta);

  if (filtros.mes) {
    const [anio, mes] = filtros.mes.split("-");
    const inicio = `${anio}-${mes}-01`;
    const fin = new Date(Number(anio), Number(mes), 0).toISOString().slice(0, 10);
    query = query.gte("fecha", inicio).lte("fecha", fin);
  }

  if (filtros.tipo)         query = query.eq("tipo", filtros.tipo);
  if (filtros.ambito)       query = query.eq("ambito", filtros.ambito);
  if (filtros.categoria_id) query = query.eq("categoria_id", filtros.categoria_id);
  if (filtros.metodo)       query = query.eq("metodo", filtros.metodo);
  if (filtros.cuenta_id)    query = query.eq("cuenta_id", filtros.cuenta_id);

  if (filtros.busqueda) {
    const b = filtros.busqueda.trim();
    query = query.or(`concepto.ilike.%${b}%,descripcion.ilike.%${b}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { movimientos: data ?? [], total: count ?? 0 };
}

export async function createMovimiento(input: MovimientoInput) {
  const { supabase, userId } = await getAuthedUser();
  const parsed = movimientoSchema.parse(input);

  const row = {
    user_id:           userId,
    tipo:              parsed.tipo,
    ambito:            parsed.ambito,
    monto:             parsed.monto,
    moneda:            parsed.moneda,
    tipo_cambio:       parsed.tipo_cambio ?? null,
    concepto:          parsed.concepto ?? null,
    descripcion:       parsed.descripcion ?? null,
    categoria_id:      parsed.tipo === "Transferencia" ? null : (parsed.categoria_id ?? null),
    clasificacion:     parsed.clasificacion,
    cuotas:            parsed.cuotas,
    frecuencia:        parsed.frecuencia,
    necesidad:         parsed.necesidad ?? null,
    metodo:            parsed.metodo ?? null,
    cuenta_id:         parsed.cuenta_id ?? null,
    tarjeta_id:        parsed.tarjeta_id ?? null,
    fecha_vencimiento: parsed.fecha_vencimiento ?? null,
    debita_de:         parsed.debita_de ?? null,
    cuenta_destino_id: parsed.tipo === "Transferencia" ? (parsed.cuenta_destino_id ?? null) : null,
    cantidad:          parsed.cantidad,
    unitario:          parsed.unitario ?? null,
    observaciones:     parsed.observaciones ?? null,
    cliente_id:        parsed.ambito === "Profesional" ? (parsed.cliente_id ?? null) : null,
    servicio_id:       parsed.ambito === "Profesional" ? (parsed.servicio_id ?? null) : null,
    fecha:             parsed.fecha ?? new Date().toISOString().slice(0, 10),
  };

  const { error } = await supabase.from("movimientos").insert(row);
  if (error) throw new Error(error.message);
}

export async function updateMovimiento(id: string, input: Partial<MovimientoInput>) {
  const { supabase, userId } = await getAuthedUser();

  const { data: existing, error: fetchError } = await supabase
    .from("movimientos")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) throw new Error("Movimiento no encontrado");

  const { error } = await supabase
    .from("movimientos")
    .update(input as Record<string, unknown>)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function deleteMovimiento(id: string) {
  const { supabase, userId } = await getAuthedUser();

  const { error } = await supabase
    .from("movimientos")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function duplicateMovimiento(id: string) {
  const { supabase, userId } = await getAuthedUser();

  const { data, error: fetchError } = await supabase
    .from("movimientos")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !data) throw new Error("Movimiento no encontrado");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _c, ...rest } = data;
  const hoy = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("movimientos").insert({ ...rest, fecha: hoy });
  if (error) throw new Error(error.message);
}
