/**
 * Sistema francés: cuota fija mensual con amortización creciente.
 * Si tasa = 0 devuelve monto / cuotas (cuota simple sin interés).
 */
export function calcularCuotaFrancesa(
  monto: number,
  cuotas: number,
  tasaAnual: number
): number {
  if (cuotas <= 0) return 0;
  const tasaMensual = tasaAnual / 12 / 100;
  if (tasaMensual === 0) return monto / cuotas;
  const factor = Math.pow(1 + tasaMensual, cuotas);
  return (monto * (tasaMensual * factor)) / (factor - 1);
}
