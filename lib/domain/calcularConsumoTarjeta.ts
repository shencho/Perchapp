// NOTE: getPeriodoCierre, getProximoVencimiento y calcularConsumoTarjeta usan
// toISOString() que puede devolver un día anterior en zonas UTC- (e.g. Argentina).
// Pendiente fix en PR separado.

// ─── helpers para getCicloDelProximoVencimiento ───────────────────────────────

function clampDay(year: number, month: number, day: number): Date {
  // JS Date maneja overflow/underflow de mes (month=-1 → dic del año anterior)
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

export function getPeriodoCierre(
  cierre_dia: number | null,
): { inicio: string; fin: string } {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth();
  const dia = hoy.getDate();

  if (!cierre_dia) {
    const inicio = new Date(año, mes, 1).toISOString().slice(0, 10);
    const fin = new Date(año, mes + 1, 0).toISOString().slice(0, 10);
    return { inicio, fin };
  }

  // Before the close day: period started last month
  if (dia < cierre_dia) {
    const inicio = new Date(año, mes - 1, cierre_dia).toISOString().slice(0, 10);
    const fin = new Date(año, mes, cierre_dia - 1).toISOString().slice(0, 10);
    return { inicio, fin };
  }

  // At or after close day: period started this month
  const inicio = new Date(año, mes, cierre_dia).toISOString().slice(0, 10);
  const fin = new Date(año, mes + 1, cierre_dia - 1).toISOString().slice(0, 10);
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
  let vtoDate: Date;
  if (dia <= vtoDia) {
    vtoDate = new Date(año, mes, vtoDia);
  } else {
    vtoDate = new Date(año, mes + 1, vtoDia);
  }
  return vtoDate.toISOString().slice(0, 10);
}
