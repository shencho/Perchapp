import { montoPropio } from "./_utils/movimiento";

/**
 * Criterio ÚNICO de "cuánto ingresé / cuánto gasté".
 *
 * Antes cada pantalla lo calculaba distinto: el inicio aplicaba montoPropio,
 * excluía reembolsos y excluía "Ajuste de inversión"; estadísticas sólo
 * aplicaba montoPropio; cash-flow y presupuestos no aplicaban nada. El mismo
 * mes daba tres números distintos según dónde lo miraras.
 *
 * Reglas:
 *  - En un gasto compartido cuenta SÓLO tu parte (montoPropio).
 *  - Un reembolso no es un ingreso nuevo: es plata que vuelve.
 *  - "Ajuste de inversión" no es movimiento real, es revaluación.
 *  - Las monedas NUNCA se suman entre sí.
 */

export interface MovimientoFinanzas {
  tipo: string;
  monto: number;
  moneda: string;
  categoria_id: string | null;
  es_compartido?: boolean | null;
  gc_mi_parte?: number | null;
  es_reembolso?: boolean | null;
}

export interface TotalesMoneda {
  ingresos: number;
  egresos: number;
  balance: number;
}

/** Nombre exacto de la categoría que representa revaluación, no movimiento. */
export const CATEGORIA_AJUSTE_INVERSION = "Ajuste de inversión";

/** Ids de "Ajuste de inversión" a partir del catálogo de categorías. */
export function idsAjusteInversion(
  categorias: { id: string; nombre: string }[],
): string[] {
  return categorias.filter((c) => c.nombre === CATEGORIA_AJUSTE_INVERSION).map((c) => c.id);
}

/** Un movimiento cuenta para ingresos/gastos. */
export function cuentaEnTotales(m: MovimientoFinanzas, excluirCategorias: string[] = []): boolean {
  if (m.tipo === "Transferencia") return false; // mover plata no es ingreso ni gasto
  if (m.categoria_id && excluirCategorias.includes(m.categoria_id)) return false;
  if (m.tipo === "Ingreso" && m.es_reembolso) return false;
  return true;
}

/** Monto que suma a los totales: en un gasto compartido, sólo tu parte. */
export function montoParaTotales(m: MovimientoFinanzas): number {
  return m.tipo === "Egreso" ? montoPropio({
    es_compartido: m.es_compartido ?? null,
    gc_mi_parte: m.gc_mi_parte ?? null,
    monto: m.monto,
  }) : m.monto;
}

/**
 * Ingresos, egresos y balance POR MONEDA. Siempre devuelve una entrada por
 * cada moneda pedida en `monedas` (en cero si no hubo movimientos), para que
 * la UI no cambie de estructura según el mes.
 */
export function totalesPorMoneda(
  movimientos: MovimientoFinanzas[],
  opts: { excluirCategorias?: string[]; monedas?: string[] } = {},
): Record<string, TotalesMoneda> {
  const { excluirCategorias = [], monedas = ["ARS", "USD"] } = opts;

  const out: Record<string, TotalesMoneda> = {};
  for (const moneda of monedas) out[moneda] = { ingresos: 0, egresos: 0, balance: 0 };

  for (const m of movimientos) {
    if (!cuentaEnTotales(m, excluirCategorias)) continue;
    const acc = (out[m.moneda] ??= { ingresos: 0, egresos: 0, balance: 0 });
    const monto = montoParaTotales(m);
    if (m.tipo === "Ingreso") acc.ingresos += monto;
    else if (m.tipo === "Egreso") acc.egresos += monto;
  }

  for (const acc of Object.values(out)) acc.balance = acc.ingresos - acc.egresos;
  return out;
}

/** % de ahorro de una moneda. null si no hubo ingresos (no es 0%: no aplica). */
export function porcentajeAhorro(t: TotalesMoneda): number | null {
  if (t.ingresos <= 0) return null;
  return Math.round(((t.ingresos - t.egresos) / t.ingresos) * 100);
}
