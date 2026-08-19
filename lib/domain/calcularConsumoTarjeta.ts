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

export function calcularConsumoTarjeta(
  tarjetaId: string,
  movimientos: { monto: number; tarjeta_id: string | null; fecha: string }[],
  inicio: string,
  fin: string,
): number {
  return movimientos
    .filter(m => m.tarjeta_id === tarjetaId && m.fecha >= inicio && m.fecha <= fin)
    .reduce((acc, m) => acc + m.monto, 0);
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
