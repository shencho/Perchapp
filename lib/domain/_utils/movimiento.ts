export function montoPropio(m: {
  es_compartido: boolean | null;
  gc_mi_parte: number | null;
  monto: number;
}): number {
  if (m.es_compartido && m.gc_mi_parte !== null) return m.gc_mi_parte;
  return m.monto;
}
