import type { RegistroTrabajo } from "@/types/supabase";

export interface AsignacionPago {
  registro_id: string;
  monto:       number;
}

export interface ResultadoFIFO {
  asignaciones:   AsignacionPago[];
  saldoRestante:  number;
}

/**
 * Asigna un monto de pago a registros pendientes usando FIFO (más antiguo primero).
 * Devuelve las asignaciones y el saldo restante (> 0 si el pago supera la deuda total).
 */
export function asignarPagoFIFO(
  registrosPendientes: RegistroTrabajo[],
  montoPago: number,
): ResultadoFIFO {
  const ordenados = [...registrosPendientes]
    .filter((r) => !r.pago_id && (r.monto ?? 0) > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const asignaciones: AsignacionPago[] = [];
  let restante = montoPago;

  for (const r of ordenados) {
    if (restante <= 0) break;
    const montoRegistro = r.monto ?? 0;
    // Asignamos el registro completo (el monto del pago cubre el registro entero o lo que queda)
    asignaciones.push({ registro_id: r.id, monto: montoRegistro });
    restante -= montoRegistro;
  }

  return { asignaciones, saldoRestante: Math.max(0, restante) };
}
