import type { RegistroTrabajo, PagoCliente } from "@/types/supabase";

export type EstadoSaldo = "al_dia" | "pendiente" | "atrasado";

export interface SaldoCliente {
  totalFacturado:   number;
  totalCobrado:     number;
  saldoPendiente:   number;
  estado:           EstadoSaldo;
  diasDeudaMasVieja: number | null;
}

/**
 * Calcula el estado de cuenta de un cliente.
 * - totalFacturado: suma de monto de todos los registros
 * - totalCobrado: suma de monto de los pagos
 * - saldoPendiente: registros sin pago_id
 * - estado: al_dia si saldo=0, atrasado si el registro pendiente más viejo tiene >30 días, pendiente en el resto
 */
export function calcularSaldoCliente(
  registros: RegistroTrabajo[],
  pagos: PagoCliente[],
): SaldoCliente {
  const totalFacturado = registros.reduce((acc, r) => acc + (r.monto ?? 0), 0);
  const totalCobrado   = pagos.reduce((acc, p) => acc + p.monto, 0);
  const saldoPendiente = Math.max(0, totalFacturado - totalCobrado);

  if (saldoPendiente === 0) {
    return { totalFacturado, totalCobrado, saldoPendiente: 0, estado: "al_dia", diasDeudaMasVieja: null };
  }

  // Fecha del registro pendiente más viejo
  const pendientes = registros
    .filter((r) => !r.pago_id)
    .map((r) => r.fecha)
    .sort();

  let diasDeudaMasVieja: number | null = null;
  let estado: EstadoSaldo = "pendiente";

  if (pendientes.length > 0) {
    const masVieja = new Date(pendientes[0]);
    const hoy = new Date();
    const dias = Math.floor((hoy.getTime() - masVieja.getTime()) / (1000 * 60 * 60 * 24));
    diasDeudaMasVieja = dias;
    estado = dias > 30 ? "atrasado" : "pendiente";
  }

  return { totalFacturado, totalCobrado, saldoPendiente, estado, diasDeudaMasVieja };
}
