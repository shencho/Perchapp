export interface ResultadoSaldoPrestamo {
  totalPagado: number;
  saldoPendiente: number;
  porcentajeCancelado: number;
}

export function calcularSaldoPrestamo(
  montoInicial: number,
  pagos: { monto: number }[]
): ResultadoSaldoPrestamo {
  const totalPagado = pagos.reduce((acc, p) => acc + p.monto, 0);
  const saldoPendiente = Math.max(0, montoInicial - totalPagado);
  const porcentajeCancelado =
    montoInicial > 0
      ? Math.min(100, Math.round((totalPagado / montoInicial) * 100))
      : 0;
  return { totalPagado, saldoPendiente, porcentajeCancelado };
}
