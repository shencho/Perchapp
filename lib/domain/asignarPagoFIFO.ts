export interface RegistroParaFIFO {
  id:              string;
  fecha:           string;
  monto_pendiente: number; // importe aún no cubierto por ningún pago
}

export interface AsignacionPago {
  registro_id:    string;
  monto_asignado: number; // cuánto cubre este pago de ese registro
}

export interface ResultadoFIFO {
  asignaciones:  AsignacionPago[];
  saldoRestante: number; // sobrante del pago después de cubrir todos los pendientes
}

/**
 * Asigna un monto de pago a registros pendientes usando FIFO (más antiguo primero).
 * Opera sobre monto_pendiente (importe real aún no cubierto por otros pagos).
 * Devuelve las asignaciones y el saldo restante (> 0 si el pago supera la deuda total).
 */
export function asignarPagoFIFO(
  registros: RegistroParaFIFO[],
  montoPago: number,
): ResultadoFIFO {
  const ordenados = [...registros]
    .filter((r) => r.monto_pendiente > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const asignaciones: AsignacionPago[] = [];
  let restante = montoPago;

  for (const r of ordenados) {
    if (restante <= 0) break;
    const cubierto = Math.min(r.monto_pendiente, restante);
    asignaciones.push({ registro_id: r.id, monto_asignado: cubierto });
    restante -= cubierto;
  }

  return { asignaciones, saldoRestante: Math.max(0, restante) };
}
