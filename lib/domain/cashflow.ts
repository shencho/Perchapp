import { cuentaEnTotales, montoParaTotales, type MovimientoFinanzas } from "./finanzas";

/**
 * Resumen mes a mes que alimenta la tabla Y la proyección.
 *
 * Antes la proyección era un promedio plano de 3 meses que mezclaba todo
 * (corriente, no corriente y cuotas) y encima le sumaba los movimientos
 * futuros ya cargados: las cuotas se contaban DOS VECES. Acá se separa lo
 * recurrente de lo puntual, así la base se puede proyectar y los compromisos
 * futuros se suman una sola vez.
 */

export interface MovimientoCashflow extends MovimientoFinanzas {
  fecha: string;
  frecuencia?: string | null;
  clasificacion?: string | null;
  cuota_grupo_id?: string | null;
}

export interface MesResumen {
  /** YYYY-MM */
  mes: string;
  ingresoCorriente: number;
  ingresoNoCorriente: number;
  egresoCorriente: number;
  egresoNoCorriente: number;
  /** Parte de los egresos que son cuotas (subconjunto, no se suma aparte). */
  egresoCuotas: number;
  ingresos: number;
  egresos: number;
  neto: number;
  /** true si el mes todavía no terminó: son compromisos, no hechos. */
  esFuturo: boolean;
}

/** Una cuota se reconoce por su clasificación o por pertenecer a un grupo. */
export function esCuota(m: MovimientoCashflow): boolean {
  return m.clasificacion === "Cuotas" || !!m.cuota_grupo_id;
}

function mesDe(fecha: string) {
  return fecha.slice(0, 7);
}

/** Lista de meses YYYY-MM entre dos extremos, inclusive. */
export function rangoMeses(desde: string, hasta: string): string[] {
  const out: string[] = [];
  const [y0, m0] = desde.split("-").map(Number);
  const [y1, m1] = hasta.split("-").map(Number);
  let y = y0, m = m0;
  while (y < y1 || (y === y1 && m <= m1)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

export function resumenMensual(
  movimientos: MovimientoCashflow[],
  opts: { meses: string[]; moneda: string; mesActual: string; excluirCategorias?: string[] },
): MesResumen[] {
  const { meses, moneda, mesActual, excluirCategorias = [] } = opts;

  const vacio = (mes: string): MesResumen => ({
    mes,
    ingresoCorriente: 0, ingresoNoCorriente: 0,
    egresoCorriente: 0, egresoNoCorriente: 0, egresoCuotas: 0,
    ingresos: 0, egresos: 0, neto: 0,
    esFuturo: mes > mesActual,
  });

  const porMes = new Map(meses.map((m) => [m, vacio(m)]));

  for (const mv of movimientos) {
    if (mv.moneda !== moneda) continue;
    if (!cuentaEnTotales(mv, excluirCategorias)) continue;
    const fila = porMes.get(mesDe(mv.fecha));
    if (!fila) continue;

    const monto = montoParaTotales(mv);
    // Las cuotas son un compromiso puntual, no parte del gasto recurrente.
    const noCorriente = mv.frecuencia === "No corriente" || esCuota(mv);

    if (mv.tipo === "Ingreso") {
      if (noCorriente) fila.ingresoNoCorriente += monto;
      else fila.ingresoCorriente += monto;
    } else if (mv.tipo === "Egreso") {
      if (noCorriente) fila.egresoNoCorriente += monto;
      else fila.egresoCorriente += monto;
      if (esCuota(mv)) fila.egresoCuotas += monto;
    }
  }

  for (const fila of porMes.values()) {
    fila.ingresos = fila.ingresoCorriente + fila.ingresoNoCorriente;
    fila.egresos = fila.egresoCorriente + fila.egresoNoCorriente;
    fila.neto = fila.ingresos - fila.egresos;
  }

  return meses.map((m) => porMes.get(m)!);
}

/**
 * Base recurrente: promedio de lo CORRIENTE de los últimos `n` meses cerrados.
 * Sólo lo corriente, porque es lo único que se repite mes a mes.
 */
export function baseRecurrente(filas: MesResumen[], mesActual: string, n = 3) {
  const cerrados = filas.filter((f) => f.mes < mesActual).slice(-n);
  if (cerrados.length === 0) return { ingresos: 0, egresos: 0, meses: 0 };
  const ingresos = cerrados.reduce((a, f) => a + f.ingresoCorriente, 0) / cerrados.length;
  const egresos = cerrados.reduce((a, f) => a + f.egresoCorriente, 0) / cerrados.length;
  return { ingresos, egresos, meses: cerrados.length };
}

/**
 * Proyección: a los meses futuros se les suma la base recurrente y se
 * conservan los compromisos ya cargados (cuotas y no corrientes), que se
 * cuentan UNA sola vez porque la base excluye lo no corriente.
 */
export function proyectar(
  filas: MesResumen[],
  opts: { mesActual: string; saldoInicial: number; incluirCompromisos?: boolean },
): (MesResumen & { saldo: number })[] {
  const { mesActual, saldoInicial, incluirCompromisos = true } = opts;
  const base = baseRecurrente(filas, mesActual);

  let saldo = saldoInicial;
  return filas.map((f) => {
    if (!f.esFuturo) return { ...f, saldo: (saldo = f.mes >= mesActual ? saldo + f.neto : saldo) };

    const ingresos = base.ingresos + (incluirCompromisos ? f.ingresoNoCorriente : 0);
    const egresos = base.egresos + (incluirCompromisos ? f.egresoNoCorriente : 0);
    const neto = ingresos - egresos;
    saldo += neto;
    return {
      ...f,
      ingresoCorriente: base.ingresos,
      egresoCorriente: base.egresos,
      ingresos, egresos, neto, saldo,
    };
  });
}
