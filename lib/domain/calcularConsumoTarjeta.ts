import { clampDay, addDays, toLocalISO } from "./_utils/dates";

// ─────────────────────────────────────────────────────────────────────────────

export function getCicloDelProximoVencimiento(
  cierre_dia: number,
  vencimiento_dia: number,
  hoy: Date = new Date(),
): { inicio: string; fin: string; fechaVencimiento: string; cicloAbierto: boolean } {
  const hoyY = hoy.getFullYear();
  const hoyM = hoy.getMonth();
  const hoyD = hoy.getDate();

  // 1. Primer vencimiento_dia que no haya pasado (hoy inclusive)
  const vtoDate =
    hoyD <= vencimiento_dia
      ? clampDay(hoyY, hoyM, vencimiento_dia)
      : clampDay(hoyY, hoyM + 1, vencimiento_dia);

  // 2. cierre_dia más reciente estrictamente ANTES de vtoDate
  let finDate = clampDay(vtoDate.getFullYear(), vtoDate.getMonth(), cierre_dia);
  if (finDate >= vtoDate) {
    finDate = clampDay(vtoDate.getFullYear(), vtoDate.getMonth() - 1, cierre_dia);
  }

  // 3. inicio = cierre un mes antes de finDate + 1 día
  const prevCierre = clampDay(finDate.getFullYear(), finDate.getMonth() - 1, cierre_dia);
  const inicioDate = addDays(prevCierre, 1);

  // 4. cicloAbierto = el cierre todavía no llegó (comparación solo-fecha)
  const hoyMidnight = new Date(hoyY, hoyM, hoyD);
  const cicloAbierto = finDate > hoyMidnight;

  return {
    inicio: toLocalISO(inicioDate),
    fin: toLocalISO(finDate),
    fechaVencimiento: toLocalISO(vtoDate),
    cicloAbierto,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fecha del PRIMER vencimiento (primer pago) de una compra en cuotas, según el
 * ciclo de la tarjeta. Evalúa si la compra entró antes o después del cierre:
 *  - compra el día ≤ cierre_dia → el resumen cierra ESTE mes → paga en el vto de ese ciclo.
 *  - compra el día > cierre_dia → el resumen cierra el mes SIGUIENTE → paga un mes después.
 * El vencimiento cae el mismo mes del cierre si vencimiento_dia > cierre_dia, o el
 * mes siguiente si vencimiento_dia ≤ cierre_dia (típico: cierra 25, vence 10).
 */
export function getPrimeraCuotaVencimiento(
  cierre_dia: number,
  vencimiento_dia: number,
  fechaCompra: Date = new Date(),
): string {
  const y = fechaCompra.getFullYear();
  const m = fechaCompra.getMonth();
  const d = fechaCompra.getDate();

  const cierreDate = d <= cierre_dia ? clampDay(y, m, cierre_dia) : clampDay(y, m + 1, cierre_dia);
  const vtoMonthOffset = vencimiento_dia > cierre_dia ? 0 : 1;
  const vtoDate = clampDay(cierreDate.getFullYear(), cierreDate.getMonth() + vtoMonthOffset, vencimiento_dia);
  return toLocalISO(vtoDate);
}

// ─────────────────────────────────────────────────────────────────────────────

export function getPeriodoCierre(
  cierre_dia: number | null,
): { inicio: string; fin: string } {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth();
  const dia = hoy.getDate();

  if (!cierre_dia) {
    const inicio = toLocalISO(new Date(año, mes, 1));
    const fin = toLocalISO(new Date(año, mes + 1, 0));
    return { inicio, fin };
  }

  // Before the close day: period started last month
  if (dia < cierre_dia) {
    const inicio = toLocalISO(clampDay(año, mes - 1, cierre_dia));
    const fin = toLocalISO(new Date(año, mes, cierre_dia - 1));
    return { inicio, fin };
  }

  // At or after close day: period started this month
  const inicio = toLocalISO(clampDay(año, mes, cierre_dia));
  const fin = toLocalISO(new Date(año, mes + 1, cierre_dia - 1));
  return { inicio, fin };
}

export interface MovimientoConsumo {
  monto: number;
  tarjeta_id: string | null;
  fecha: string;
  moneda: string;
  /** Sólo los Egresos son consumo: un pago de resumen es una Transferencia. */
  tipo: string;
  /** Un consumo con cuenta ya salió del banco al comprarse. */
  cuenta_id?: string | null;
  /** Un pago de resumen es Transferencia con tarjeta y SIN cuenta destino. */
  cuenta_destino_id?: string | null;
}

export interface SaldoMoneda {
  /** Total consumido en el ciclo. */
  total: number;
  /** Parte que ya descontó de una cuenta al comprarse: no se vuelve a pagar. */
  yaDescontado: number;
  /**
   * Créditos a favor en el ciclo: devoluciones de percepciones, reintegros,
   * anulaciones. Se cargan como Ingreso con la tarjeta.
   */
  devoluciones: number;
  /** Pagos del resumen ya registrados para este ciclo. */
  yaPagado: number;
  /** Lo que realmente falta pagar. Nunca negativo. */
  aPagar: number;
}

/**
 * Consumo de una tarjeta en un período, SEPARADO POR MONEDA.
 *
 * Antes devolvía un único número sumando ARS y USD como si fueran lo mismo
 * (un consumo de US$100 se sumaba como $100), y contaba cualquier movimiento
 * de la tarjeta — incluidos los pagos de resumen, que son Transferencias y
 * por lo tanto inflaban el consumo en vez de cancelarlo.
 */
export function calcularConsumoTarjeta(
  tarjetaId: string,
  movimientos: MovimientoConsumo[],
  inicio: string,
  fin: string,
): Record<string, number> {
  const porMoneda: Record<string, number> = {};
  for (const m of movimientos) {
    if (m.tarjeta_id !== tarjetaId) continue;
    if (m.fecha < inicio || m.fecha > fin) continue;
    if (m.tipo !== "Egreso") continue;
    porMoneda[m.moneda] = (porMoneda[m.moneda] ?? 0) + m.monto;
  }
  return porMoneda;
}

/**
 * Saldo del ciclo de una tarjeta: lo consumido MENOS lo ya pagado, por moneda.
 *
 * Existía sólo dentro de `getResumenTarjeta`, que hace sus propias queries y va
 * de a una tarjeta. Las otras tres pantallas (listado, inicio y la alerta de
 * vencimiento) usaban `calcularConsumoTarjeta`, que suma únicamente Egresos y
 * por lo tanto NUNCA baja al pagar: registrabas el pago y la tarjeta seguía
 * mostrando el total del ciclo como si no hubieras pagado nada.
 *
 * Acá la lógica es pura y trabaja sobre un array ya cargado, así el inicio y el
 * listado la aplican a todas las tarjetas sin una query por tarjeta.
 *
 * `finPagos` suele ser el vencimiento del ciclo, no su cierre: el pago se hace
 * después de que cerró.
 */
export function calcularSaldoTarjeta(
  tarjetaId: string,
  movimientos: MovimientoConsumo[],
  inicio: string,
  fin: string,
  finPagos?: string | null,
): Record<string, SaldoMoneda> {
  const out: Record<string, SaldoMoneda> = {};
  const dame = (moneda: string) =>
    (out[moneda] ??= { total: 0, yaDescontado: 0, devoluciones: 0, yaPagado: 0, aPagar: 0 });

  const topePagos = finPagos ?? fin;

  for (const m of movimientos) {
    if (m.tarjeta_id !== tarjetaId) continue;

    if (m.tipo === "Egreso") {
      if (m.fecha < inicio || m.fecha > fin) continue;
      const acc = dame(m.moneda);
      acc.total += m.monto;
      if (m.cuenta_id) acc.yaDescontado += m.monto;
      continue;
    }

    // Un Ingreso con la tarjeta es un crédito a favor: devolución de
    // percepciones, reintegro, anulación. Antes se ignoraba por completo, así
    // que no bajaba lo que había que pagar; el banco sí lo descuenta del
    // resumen.
    if (m.tipo === "Ingreso") {
      if (m.fecha < inicio || m.fecha > fin) continue;
      dame(m.moneda).devoluciones += m.monto;
      continue;
    }

    // Pago del resumen: Transferencia de la tarjeta sin cuenta destino.
    if (m.tipo === "Transferencia" && !m.cuenta_destino_id) {
      if (m.fecha < inicio || m.fecha > topePagos) continue;
      dame(m.moneda).yaPagado += m.monto;
    }
  }

  for (const acc of Object.values(out)) {
    acc.aPagar = Math.max(
      0,
      Math.round((acc.total - acc.yaDescontado - acc.devoluciones - acc.yaPagado) * 100) / 100,
    );
  }
  return out;
}

export function getProximoVencimiento(
  vencimiento_dia: number | null,
): string | null {
  if (!vencimiento_dia) return null;
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth();
  const dia = hoy.getDate();
  const vtoDia = vencimiento_dia;

  // Find next vencimiento date
  const vtoDate = dia <= vtoDia ? clampDay(año, mes, vtoDia) : clampDay(año, mes + 1, vtoDia);
  return toLocalISO(vtoDate);
}
