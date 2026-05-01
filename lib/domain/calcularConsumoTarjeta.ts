export function getPeriodoCierre(
  cierre_dia: number | null,
): { inicio: string; fin: string } {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth();
  const dia = hoy.getDate();

  if (!cierre_dia) {
    const inicio = new Date(año, mes, 1).toISOString().slice(0, 10);
    const fin = new Date(año, mes + 1, 0).toISOString().slice(0, 10);
    return { inicio, fin };
  }

  // Before the close day: period started last month
  if (dia < cierre_dia) {
    const inicio = new Date(año, mes - 1, cierre_dia).toISOString().slice(0, 10);
    const fin = new Date(año, mes, cierre_dia - 1).toISOString().slice(0, 10);
    return { inicio, fin };
  }

  // At or after close day: period started this month
  const inicio = new Date(año, mes, cierre_dia).toISOString().slice(0, 10);
  const fin = new Date(año, mes + 1, cierre_dia - 1).toISOString().slice(0, 10);
  return { inicio, fin };
}

export function calcularConsumoTarjeta(
  tarjetaId: string,
  movimientos: { monto: number; tarjeta_id: string | null; fecha: string }[],
  inicio: string,
  fin: string,
): number {
  return movimientos
    .filter(m => m.tarjeta_id === tarjetaId && m.fecha >= inicio && m.fecha <= fin)
    .reduce((acc, m) => acc + m.monto, 0);
}

export function getProximoVencimiento(
  vencimiento_dia: number | null,
): string | null {
  if (!vencimiento_dia) return null;
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth();
  const dia = hoy.getDate();
  const vtoDia = vencimiento_dia;

  // Find next vencimiento date
  let vtoDate: Date;
  if (dia <= vtoDia) {
    vtoDate = new Date(año, mes, vtoDia);
  } else {
    vtoDate = new Date(año, mes + 1, vtoDia);
  }
  return vtoDate.toISOString().slice(0, 10);
}
