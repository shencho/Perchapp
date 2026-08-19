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
      prestamos:prestamo_id ( id, tipo, institucion_nombre, persona_id, personas ( nombre ) ),
      gastos_compartidos_participantes ( id, estado, monto )
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

export async function createMovimiento(input: MovimientoInput): Promise<{ id: string }> {
  const { supabase, userId } = await getAuthedUser();
  const parsed = movimientoSchema.parse(input);

  // Evitar FK 500: si el intérprete devuelve un UUID de cuenta/tarjeta inexistente
  // o ajeno, se rechaza con mensaje claro (el usuario selecciona manualmente).
  const cuentaRefs = [
    parsed.cuenta_id ?? null,
    parsed.tipo === "Transferencia" ? (parsed.cuenta_destino_id ?? null) : null,
  ].filter((x): x is string => !!x);
  if (cuentaRefs.length > 0) {
    const { data: cuentasOk } = await supabase
      .from("cuentas").select("id").eq("user_id", userId).in("id", cuentaRefs);
    const ok = new Set((cuentasOk ?? []).map((c) => c.id));
    if (cuentaRefs.some((id) => !ok.has(id))) {
      throw new Error("No reconocí la cuenta indicada. Seleccionala manualmente y guardá de nuevo.");
    }
  }
  let tarjetaCiclo: { cierre_dia: number | null; vencimiento_dia: number | null } | null = null;
  if (parsed.tarjeta_id) {
    const { data: tarjetaOk } = await supabase
      .from("tarjetas").select("id, cierre_dia, vencimiento_dia").eq("user_id", userId).eq("id", parsed.tarjeta_id).maybeSingle();
    if (!tarjetaOk) {
      throw new Error("No reconocí la tarjeta indicada. Seleccionala manualmente y guardá de nuevo.");
    }
    tarjetaCiclo = { cierre_dia: tarjetaOk.cierre_dia, vencimiento_dia: tarjetaOk.vencimiento_dia };
  }

  const baseFecha = parsed.fecha ?? new Date().toISOString().slice(0, 10);

  const row = {
    user_id:           userId,
    tipo:              parsed.tipo,
    monto:             parsed.monto,
    monto_destino:     parsed.tipo === "Transferencia" ? (parsed.monto_destino ?? null) : null,
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
    fecha:             baseFecha,
    es_compartido:     parsed.es_compartido ?? false,
    gc_mi_parte:       parsed.gc_mi_parte ?? null,
  };

  // Gasto en cuotas (>1): generar UN movimiento por cuota, prorrateado y
  // fechado al ciclo de la tarjeta. Cada uno "concepto (cuota i/N)".
  if (parsed.clasificacion === "Cuotas" && parsed.cuotas > 1) {
    const { generarCuotas } = await import("@/lib/domain/cuotas");
    const grupoId = crypto.randomUUID();
    const baseConcepto = parsed.concepto?.trim() || "Gasto";
    const cuotasGen = generarCuotas({
      montoTotal: parsed.monto,
      cuotas: parsed.cuotas,
      fechaRegistro: baseFecha,
      tarjeta: tarjetaCiclo,
      fechaPrimeraOverride: parsed.cuotas_primera_fecha ?? null,
    });

    const rows = cuotasGen.map((c) => ({
      ...row,
      monto:             c.monto,
      unitario:          c.monto,
      fecha:             c.fecha,
      fecha_vencimiento: c.fecha_vencimiento ?? parsed.fecha_vencimiento ?? null,
      concepto:          `${baseConcepto} (cuota ${c.cuota_numero}/${parsed.cuotas})`,
      cuota_numero:      c.cuota_numero,
      cuota_grupo_id:    grupoId,
    }));

    const { data, error } = await supabase.from("movimientos").insert(rows).select("id, cuota_numero");
    if (error || !data || data.length === 0) throw new Error(error?.message ?? "Error al crear las cuotas");
    const primera = data.find((d) => d.cuota_numero === 1) ?? data[0];
    return { id: primera.id };
  }

  const { data, error } = await supabase.from("movimientos").insert(row).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Error al crear movimiento");
  return { id: data.id };
}

/**
 * Columnas actualizables de `movimientos`. El payload del editor arrastra campos
 * que sólo viven en el formulario y no en la tabla; se filtran contra esta lista.
 */
const COLUMNAS_MOVIMIENTO = new Set([
  "cuenta_id", "categoria_id", "tipo", "ambito", "monto", "monto_destino", "moneda",
  "tipo_cambio", "concepto", "descripcion", "clasificacion", "cuotas", "frecuencia",
  "necesidad", "metodo", "tarjeta_id", "fecha_vencimiento", "debita_de",
  "cuenta_destino_id", "cantidad", "unitario", "observaciones", "cliente_id",
  "servicio_id", "fecha", "es_compartido", "gc_mi_parte", "es_reembolso",
  "cuota_numero", "cuota_grupo_id", "prestamo_id", "prestamo_pago_id",
  "plantilla_recurrente_id",
]);

export async function updateMovimiento(id: string, input: Partial<MovimientoInput>) {
  const { supabase, userId } = await getAuthedUser();

  const { data: existing, error: fetchError } = await supabase
    .from("movimientos")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) throw new Error("Movimiento no encontrado");

  // Sólo se mandan columnas reales de la tabla: el formulario incluye campos que
  // no son columnas (cuotas_primera_fecha, crear_recurrente, nombre_plantilla,
  // dia_mes_recurrente…) y cualquiera de ellos hace fallar TODO el update.
  const campos: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (COLUMNAS_MOVIMIENTO.has(k)) campos[k] = v;
  }

  const { error } = await supabase
    .from("movimientos")
    .update(campos)
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

/** Borra TODAS las cuotas de una compra (mismo cuota_grupo_id). */
export async function deleteGrupoCuotas(cuotaGrupoId: string) {
  const { supabase, userId } = await getAuthedUser();

  const { error } = await supabase
    .from("movimientos")
    .delete()
    .eq("cuota_grupo_id", cuotaGrupoId)
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

  const { data: nuevo, error } = await supabase
    .from("movimientos")
    .insert({ ...rest, fecha: hoy })
    .select("id")
    .single();
  if (error || !nuevo) throw new Error(error?.message ?? "Error al duplicar");

  // Si era gasto compartido, copiar participantes como pendientes
  if (data.es_compartido) {
    const { data: parts } = await supabase
      .from("gastos_compartidos_participantes")
      .select("persona_nombre, persona_id, monto, cuenta_destino_id")
      .eq("movimiento_id", id)
      .eq("user_id", userId);

    if (parts && parts.length > 0) {
      await supabase.from("gastos_compartidos_participantes").insert(
        parts.map((p) => ({
          user_id:          userId,
          movimiento_id:    nuevo.id,
          persona_nombre:   p.persona_nombre,
          persona_id:       p.persona_id,
          monto:            p.monto,
          estado:           "pendiente" as const,
          cuenta_destino_id: p.cuenta_destino_id,
          movimiento_ingreso_id: null,
        })),
      );
    }
  }
}
