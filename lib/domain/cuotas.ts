import { clampDay, toLocalISO } from "./_utils/dates";
import { getPrimeraCuotaVencimiento, getProximoVencimiento } from "./calcularConsumoTarjeta";

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
  /**
   * Carga inicial de cuotas YA en curso: fija el mes/fecha de la PRÓXIMA cuota
   * (YYYY-MM-DD) y saltea la lógica de cierre. Las N cuotas arrancan desde acá.
   */
  fechaPrimeraOverride?: string | null;
}): CuotaGenerada[] {
  const { montoTotal, cuotas, fechaRegistro, tarjeta, fechaPrimeraOverride } = params;
  const N = Math.max(1, Math.floor(cuotas));
  const unitario = r2(montoTotal / N);

  let primera: string;
  let usaVto = false;
  if (fechaPrimeraOverride) {
    // Cuotas en curso: el usuario indica cuándo cae la próxima; se respeta tal cual.
    primera = fechaPrimeraOverride;
    usaVto = !!tarjeta?.vencimiento_dia;
  } else if (tarjeta?.cierre_dia && tarjeta?.vencimiento_dia) {
    // Primer pago según el ciclo: evalúa si la compra entró antes/después del cierre.
    primera = getPrimeraCuotaVencimiento(
      tarjeta.cierre_dia,
      tarjeta.vencimiento_dia,
      new Date(fechaRegistro + "T12:00:00"),
    );
    usaVto = true;
  } else if (tarjeta?.vencimiento_dia) {
    // Sólo vencimiento (sin cierre): próximo vto, pagando desde el mes siguiente.
    primera = addMonthsISO(getProximoVencimiento(tarjeta.vencimiento_dia) ?? fechaRegistro, 1);
    usaVto = true;
  } else {
    // Sin tarjeta: se paga a partir del mes SIGUIENTE (intuitivo para el control diario).
    primera = addMonthsISO(fechaRegistro, 1);
  }

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
