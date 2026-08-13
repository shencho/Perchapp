import { clampDay, toLocalISO } from "./_utils/dates";
import { getCicloDelProximoVencimiento, getProximoVencimiento } from "./calcularConsumoTarjeta";

function addMonthsISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toLocalISO(clampDay(y, (m - 1) + n, d));
}
function r2(x: number) { return Math.round(x * 100) / 100; }

export interface CuotaGenerada {
  cuota_numero: number;
  fecha: string;
  fecha_vencimiento: string | null;
  monto: number;
}

/**
 * Genera las N cuotas de una compra: una por mes, alineadas al ciclo de la
 * tarjeta (la cuota 1 cae en el resumen correspondiente a la fecha de registro
 * vs. el cierre; las siguientes +1 mes). Si no hay tarjeta, +1 mes desde la
 * fecha de registro. El monto se reparte parejo y la última cuota absorbe el
 * redondeo para cerrar exacto contra el total.
 */
export function generarCuotas(params: {
  montoTotal: number;
  cuotas: number;
  fechaRegistro: string; // YYYY-MM-DD
  tarjeta?: { cierre_dia: number | null; vencimiento_dia: number | null } | null;
}): CuotaGenerada[] {
  const { montoTotal, cuotas, fechaRegistro, tarjeta } = params;
  const N = Math.max(1, Math.floor(cuotas));
  const unitario = r2(montoTotal / N);

  let primera: string;
  let usaVto = false;
  if (tarjeta?.cierre_dia && tarjeta?.vencimiento_dia) {
    primera = getCicloDelProximoVencimiento(
      tarjeta.cierre_dia,
      tarjeta.vencimiento_dia,
      new Date(fechaRegistro + "T12:00:00"),
    ).fechaVencimiento;
    usaVto = true;
  } else if (tarjeta?.vencimiento_dia) {
    primera = getProximoVencimiento(tarjeta.vencimiento_dia) ?? fechaRegistro;
    usaVto = true;
  } else {
    primera = fechaRegistro;
  }

  // La compra se paga a partir del mes SIGUIENTE (más intuitivo para el control
  // diario: el gasto de hoy impacta recién en el próximo resumen/mes).
  primera = addMonthsISO(primera, 1);

  const out: CuotaGenerada[] = [];
  for (let i = 1; i <= N; i++) {
    const fecha = addMonthsISO(primera, i - 1);
    const monto = i < N ? unitario : r2(montoTotal - unitario * (N - 1));
    out.push({
      cuota_numero: i,
      fecha,
      fecha_vencimiento: usaVto ? fecha : null,
      monto,
    });
  }
  return out;
}
