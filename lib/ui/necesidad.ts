/**
 * Escala de necesidad de un gasto. UN solo lugar.
 *
 * Estaba definida dos veces con sentidos OPUESTOS: el editor (donde el usuario
 * carga el valor) decía 1 = Innecesario y 5 = Esencial, y estadísticas decía
 * 1 = Imprescindible y 5 = Superfluo. O sea que lo que cargabas como "esencial"
 * la pantalla de análisis te lo mostraba como "superfluo".
 *
 * Manda el editor: es donde se asigna el valor, y es lo que ya reflejaban los
 * colores del inicio (1 rojo, 5 verde).
 *
 *   1 = lo menos necesario · 5 = lo más necesario
 */
export const NECESIDAD_LABELS: Record<number, string> = {
  1: "Innecesario",
  2: "Prescindible",
  3: "Medio",
  4: "Necesario",
  5: "Esencial",
};

export const NECESIDAD_NIVELES = [1, 2, 3, 4, 5] as const;

/** "3 · Medio" — para listas y leyendas. */
export function etiquetaNecesidad(nivel: number): string {
  const l = NECESIDAD_LABELS[nivel];
  return l ? `${nivel} · ${l}` : String(nivel);
}
