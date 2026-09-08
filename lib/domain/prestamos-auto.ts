import { clampDay, toLocalISO } from "./_utils/dates";

/**
 * Cuotas de préstamo que deberían aplicarse este mes y todavía no se aplicaron.
 *
 * El caso real es una cuota fija que llega igual todos los meses (ANSES): hasta
 * ahora había que registrarla a mano cada vez. Esto la detecta y la propone en
 * el mismo flujo de pendientes que las plantillas recurrentes — NO la inserta
 * sola. Un movimiento que aparece sin que nadie lo pida es peor que uno que
 * falta: nadie lo audita.
 *
 * Se decidió reusar el flujo de pendientes en vez de un cron: el usuario ya
 * conoce esa pantalla, ya la revisa, y así la cuota queda sujeta a la misma
 * confirmación que todo lo demás.
 */

export interface PrestamoAutoLiquidable {
  id: string;
  tipo: string;
  institucion_nombre: string | null;
  moneda: string;
  cuota_mensual: number | null;
  dia_vencimiento_cuota: number | null;
  cantidad_cuotas: number | null;
  estado: string;
  archivado: boolean;
  auto_liquidar: boolean;
}

export interface CuotaPendiente {
  prestamo: PrestamoAutoLiquidable;
  /** Fecha en que correspondería, con el día acotado al largo del mes. */
  fechaEsperada: string;
  /** Negativo si ya pasó. */
  diasRestantes: number;
  atrasada: boolean;
  monto: number;
  /** Cuántas cuotas ya se registraron, para numerar la nueva. */
  cuotaNumero: number;
}

export function getCuotasPendientesDelMes(
  prestamos: PrestamoAutoLiquidable[],
  pagos: { prestamo_id: string; fecha: string }[],
  hoy: Date = new Date(),
): CuotaPendiente[] {
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const inicioMes = toLocalISO(new Date(anio, mes, 1));
  const finMes = toLocalISO(new Date(anio, mes + 1, 0));

  return prestamos
    .filter((p) => p.auto_liquidar && p.estado === "activo" && !p.archivado)
    // Sin monto o sin día no hay nada que proponer. El flag se puede activar
    // antes de completar esos datos, así que hay que filtrar acá.
    .filter((p) => (p.cuota_mensual ?? 0) > 0 && p.dia_vencimiento_cuota != null)
    .filter((p) => {
      const yaEsteMes = pagos.some(
        (pg) => pg.prestamo_id === p.id && pg.fecha >= inicioMes && pg.fecha <= finMes,
      );
      return !yaEsteMes;
    })
    .map((p) => {
      const fecha = clampDay(anio, mes, p.dia_vencimiento_cuota!);
      const yaPagas = pagos.filter((pg) => pg.prestamo_id === p.id).length;
      const diasRestantes = fecha.getDate() - hoy.getDate();
      return {
        prestamo: p,
        fechaEsperada: toLocalISO(fecha),
        diasRestantes,
        atrasada: diasRestantes < 0,
        monto: p.cuota_mensual!,
        cuotaNumero: yaPagas + 1,
      };
    })
    // Si el préstamo ya cubrió todas sus cuotas, no hay nada que proponer.
    .filter((c) => !c.prestamo.cantidad_cuotas || c.cuotaNumero <= c.prestamo.cantidad_cuotas)
    .sort((a, b) => a.fechaEsperada.localeCompare(b.fechaEsperada));
}
