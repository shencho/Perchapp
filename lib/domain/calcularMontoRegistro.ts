import type { ServicioCliente, TarifaHistorial, RegistroTrabajo } from "@/types/supabase";
import { calcularTarifaVigente } from "./calcularTarifaVigente";

export interface ResultadoCalculo {
  tarifa_aplicada: number;
  monto: number;
  es_extra: boolean;
}

/**
 * Calcula el monto de un registro nuevo considerando la tarifa vigente y el tope mensual.
 *
 * Si el servicio tiene tope_unidades_periodo y ya se superó (contando el nuevo),
 * aplica tarifa_unidad_extra a partir de la unidad que excede.
 */
export function calcularMontoRegistro(params: {
  servicio: ServicioCliente;
  historial: TarifaHistorial[];
  fecha: string;
  cantidad: number;
  registrosMes: RegistroTrabajo[];
}): ResultadoCalculo {
  const { servicio, historial, fecha, cantidad, registrosMes } = params;

  const tarifaVigente = calcularTarifaVigente(historial, fecha);
  const tarifaBase = tarifaVigente?.tarifa ?? servicio.tarifa_actual ?? 0;

  // Sin tope → tarifa normal
  if (!servicio.tope_unidades_periodo) {
    return { tarifa_aplicada: tarifaBase, monto: tarifaBase * cantidad, es_extra: false };
  }

  const tope = servicio.tope_unidades_periodo;
  const tarifaExtra = servicio.tarifa_unidad_extra ?? tarifaBase;

  // Cuántas unidades ya se registraron en el mismo mes para este servicio
  const unidadesMes = registrosMes.reduce((acc, r) => acc + (r.cantidad ?? 1), 0);

  if (unidadesMes >= tope) {
    // Ya se superó el tope antes de este registro → todo va a tarifa extra
    return { tarifa_aplicada: tarifaExtra, monto: tarifaExtra * cantidad, es_extra: true };
  }

  const disponibles = tope - unidadesMes;

  if (cantidad <= disponibles) {
    // Cabe entero dentro del tope
    return { tarifa_aplicada: tarifaBase, monto: tarifaBase * cantidad, es_extra: false };
  }

  // Parte a tarifa normal, parte a tarifa extra
  const montoNormal = tarifaBase * disponibles;
  const montoExtra  = tarifaExtra * (cantidad - disponibles);
  return {
    tarifa_aplicada: tarifaBase,
    monto: montoNormal + montoExtra,
    es_extra: true,
  };
}
