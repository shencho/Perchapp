import type { TarifaHistorial } from "@/types/supabase";

export interface TarifaVigente {
  tarifa: number;
  moneda: string;
}

/**
 * Devuelve la tarifa vigente en una fecha dada según el historial de un servicio.
 * Si no hay historial, devuelve null.
 */
export function calcularTarifaVigente(
  historial: TarifaHistorial[],
  fecha: string,
): TarifaVigente | null {
  if (!historial.length) return null;

  const vigente = historial.find((h) => {
    const desde = h.vigente_desde <= fecha;
    const hasta  = h.vigente_hasta == null || h.vigente_hasta >= fecha;
    return desde && hasta;
  });

  if (!vigente) return null;
  return { tarifa: vigente.tarifa, moneda: vigente.moneda };
}
