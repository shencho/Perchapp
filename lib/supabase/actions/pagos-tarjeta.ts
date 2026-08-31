"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SaldoMoneda } from "@/lib/domain/calcularConsumoTarjeta";
import { calcularSaldoTarjeta, getCicloDelProximoVencimiento, getPeriodoCierre, getProximoVencimiento } from "@/lib/domain/calcularConsumoTarjeta";

/**
 * El pago del resumen NO es un gasto nuevo: el gasto ya quedó registrado al
 * consumir. Se modela como Transferencia (sale plata de la cuenta y cancela la
 * deuda de la tarjeta), así no vuelve a contarse en los totales de egresos.
 * Un pago de tarjeta = Transferencia con tarjeta_id y sin cuenta_destino_id.
 */

/** El desglose vive en el dominio, compartido con el listado y el inicio. */
export type ResumenMoneda = SaldoMoneda;

export interface ResumenTarjeta {
  inicio: string;
  fin: string;
  vencimiento: string | null;
  porMoneda: Record<string, ResumenMoneda>;
  /** Pagos ya registrados para este ciclo. */
  yaPagado: { id: string; monto: number; moneda: string; fecha: string }[];
}

export async function getResumenTarjeta(tarjetaId: string): Promise<ResumenTarjeta | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: tarjeta } = await supabase
    .from("tarjetas").select("id, cierre_dia, vencimiento_dia")
    .eq("id", tarjetaId).eq("user_id", user.id).maybeSingle();
  if (!tarjeta) return null;

  let inicio: string, fin: string, vencimiento: string | null;
  if (tarjeta.cierre_dia != null && tarjeta.vencimiento_dia != null) {
    const c = getCicloDelProximoVencimiento(tarjeta.cierre_dia, tarjeta.vencimiento_dia);
    inicio = c.inicio; fin = c.fin; vencimiento = c.fechaVencimiento;
  } else {
    const p = getPeriodoCierre(tarjeta.cierre_dia);
    inicio = p.inicio; fin = p.fin; vencimiento = getProximoVencimiento(tarjeta.vencimiento_dia);
  }

  // Una sola consulta con consumos Y pagos; el reparto lo hace la función pura
  // de dominio, la misma que usan el listado, el inicio y la alerta. Antes esta
  // lógica vivía sólo acá y las otras tres pantallas tenían la suya, que no
  // restaba los pagos.
  const topePagos = vencimiento ?? fin;
  const { data: movs } = await supabase
    .from("movimientos")
    .select("id, tipo, monto, moneda, fecha, tarjeta_id, cuenta_id, cuenta_destino_id")
    .eq("user_id", user.id).eq("tarjeta_id", tarjetaId)
    .gte("fecha", inicio).lte("fecha", topePagos);

  const porMoneda = calcularSaldoTarjeta(tarjetaId, movs ?? [], inicio, fin, topePagos);

  const pagos = (movs ?? [])
    .filter((m) => m.tipo === "Transferencia" && !m.cuenta_destino_id)
    .map((m) => ({ id: m.id, monto: m.monto, moneda: m.moneda, fecha: m.fecha }));

  return { inicio, fin, vencimiento, porMoneda, yaPagado: pagos };
}

export async function pagarTarjeta(input: {
  tarjetaId: string;
  cuentaId: string;
  monto: number;          // monto final que sale de la cuenta (resumen + ajuste)
  moneda: string;
  fecha: string;
  vencimiento?: string | null;
  observacion?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  if (!(input.monto > 0)) return { error: "El monto a pagar debe ser mayor a 0." };

  const [{ data: tarjeta }, { data: cuenta }] = await Promise.all([
    supabase.from("tarjetas").select("id, nombre").eq("id", input.tarjetaId).eq("user_id", user.id).maybeSingle(),
    supabase.from("cuentas").select("id, moneda").eq("id", input.cuentaId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!tarjeta) return { error: "No encontré la tarjeta." };
  if (!cuenta)  return { error: "Elegí la cuenta desde la que pagás." };

  const { data, error } = await supabase.from("movimientos").insert({
    user_id:           user.id,
    tipo:              "Transferencia",
    monto:             input.monto,
    moneda:            input.moneda || cuenta.moneda,
    concepto:          `Pago tarjeta ${tarjeta.nombre}`,
    cuenta_id:         input.cuentaId,
    cuenta_destino_id: null,          // el destino es la tarjeta, no una cuenta
    tarjeta_id:        input.tarjetaId,
    fecha:             input.fecha,
    fecha_vencimiento: input.vencimiento ?? null, // ciclo que se está pagando
    clasificacion:     "Variable",
    cuotas:            1,
    frecuencia:        "Corriente",
    cantidad:          1,
    observaciones:     input.observacion ?? null,
  }).select("id").single();

  if (error || !data) return { error: error?.message ?? "No se pudo registrar el pago." };

  revalidatePath("/movimientos");
  revalidatePath("/cuentas");
  revalidatePath(`/cuentas/tarjetas/${input.tarjetaId}`);
  return { id: data.id };
}
