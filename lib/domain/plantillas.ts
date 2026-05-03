import { clampDay, toLocalISO } from "./_utils/dates";
import type { PlantillaRecurrente } from "@/types/supabase";

export type PlantillaConEstado = {
  plantilla: PlantillaRecurrente;
  fechaEsperada: string;  // YYYY-MM-DD, clamped to month end
  diasRestantes: number;  // negative if overdue
  atrasada: boolean;
};

export function getPlantillasPendientesDelMes(
  plantillas: PlantillaRecurrente[],
  movimientos: { plantilla_recurrente_id: string | null; fecha: string }[],
  hoy: Date = new Date(),
): PlantillaConEstado[] {
  const hoyY = hoy.getFullYear();
  const hoyM = hoy.getMonth();
  const hoyD = hoy.getDate();

  const inicioMes = toLocalISO(new Date(hoyY, hoyM, 1));
  const finMes    = toLocalISO(new Date(hoyY, hoyM + 1, 0));

  return plantillas
    .filter(p => p.activo)
    .filter(p => {
      if (p.fecha_inicio > finMes)                          return false;
      if (p.fecha_fin && p.fecha_fin < inicioMes)           return false;
      return true;
    })
    .filter(p => {
      const yaGenerado = movimientos.some(
        m => m.plantilla_recurrente_id === p.id &&
             m.fecha >= inicioMes && m.fecha <= finMes,
      );
      return !yaGenerado;
    })
    .map(p => {
      const fechaDate    = clampDay(hoyY, hoyM, p.dia_mes);
      const fechaEsperada = toLocalISO(fechaDate);
      const diasRestantes = fechaDate.getDate() - hoyD;
      return { plantilla: p, fechaEsperada, diasRestantes, atrasada: diasRestantes < 0 };
    })
    .sort((a, b) => a.plantilla.dia_mes - b.plantilla.dia_mes);
}

export function getPlantillasParaAlerta(
  plantillas: PlantillaRecurrente[],
  movimientos: { plantilla_recurrente_id: string | null; fecha: string }[],
  hoy: Date = new Date(),
): PlantillaConEstado[] {
  return getPlantillasPendientesDelMes(plantillas, movimientos, hoy)
    .filter(p => p.atrasada || (p.diasRestantes >= 0 && p.diasRestantes <= 3));
}
