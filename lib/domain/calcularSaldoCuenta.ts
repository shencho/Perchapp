export interface MovimientoParaSaldo {
  tipo: string;
  monto: number;
  cuenta_id: string | null;
  cuenta_destino_id: string | null;
}

export function calcularSaldoCuenta(
  cuentaId: string,
  saldoInicial: number,
  movimientos: MovimientoParaSaldo[],
): number {
  let saldo = saldoInicial;
  for (const m of movimientos) {
    if (m.tipo === "Ingreso"      && m.cuenta_id        === cuentaId) saldo += m.monto;
    if (m.tipo === "Egreso"       && m.cuenta_id        === cuentaId) saldo -= m.monto;
    if (m.tipo === "Transferencia" && m.cuenta_destino_id === cuentaId) saldo += m.monto;
    if (m.tipo === "Transferencia" && m.cuenta_id        === cuentaId) saldo -= m.monto;
  }
  return saldo;
}

export function calcularIngresosDelMes(
  cuentaId: string,
  movimientos: MovimientoParaSaldo[],
): number {
  return movimientos
    .filter(m => m.tipo === "Ingreso" && m.cuenta_id === cuentaId)
    .reduce((acc, m) => acc + m.monto, 0);
}

export function calcularEgresosDelMes(
  cuentaId: string,
  movimientos: MovimientoParaSaldo[],
): number {
  return movimientos
    .filter(m => m.tipo === "Egreso" && m.cuenta_id === cuentaId)
    .reduce((acc, m) => acc + m.monto, 0);
}
