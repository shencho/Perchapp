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
 * Base recurrente: lo CORRIENTE del ÚLTIMO MES CERRADO.
 *
 * Antes era el promedio de 3 meses, que se contaminaba con meses atípicos
 * (un mes con un gasto no corriente grande inflaba toda la proyección). El
 * último mes cerrado es más predecible y es lo que se replica hacia adelante.
 */
export function baseRecurrente(filas: MesResumen[], mesActual: string) {
  const cerrados = filas.filter((f) => f.mes < mesActual);
  const ultimo = cerrados[cerrados.length - 1];
  return {
    ingresos: ultimo?.ingresoCorriente ?? 0,
    egresos: ultimo?.egresoCorriente ?? 0,
    mes: ultimo?.mes ?? null,
  };
}

export interface MesProyectado extends MesResumen {
  saldo: number;
  /** true si a este mes se le aplicó la base recurrente. */
  proyectado: boolean;
}

/**
 * Proyección hacia adelante.
 *
 * - Meses cerrados: tal cual se cargaron.
 * - Mes en curso: lo real MÁS lo que faltaría del corriente para un mes
 *   completo. Se usa max(real, base) para no inventar gasto si el mes ya
 *   viene más cargado que la base.
 * - Meses futuros: la base recurrente + los compromisos ya cargados (cuotas y
 *   no corrientes), que se cuentan una sola vez porque la base excluye lo no
 *   corriente.
 */
export function proyectar(
  filas: MesResumen[],
  opts: { mesActual: string; saldoInicial: number; incluirCompromisos?: boolean },
): MesProyectado[] {
  const { mesActual, saldoInicial, incluirCompromisos = true } = opts;
  const base = baseRecurrente(filas, mesActual);

  let saldo = saldoInicial;
  return filas.map((f) => {
    if (f.mes < mesActual) {
      return { ...f, saldo, proyectado: false };
    }

    const esActual = f.mes === mesActual;
    // En el mes en curso lo real manda si ya supera la base.
    const ingresoCorriente = esActual ? Math.max(f.ingresoCorriente, base.ingresos) : base.ingresos;
    const egresoCorriente = esActual ? Math.max(f.egresoCorriente, base.egresos) : base.egresos;

    const ingresoNoCorriente = incluirCompromisos ? f.ingresoNoCorriente : 0;
    const egresoNoCorriente = incluirCompromisos ? f.egresoNoCorriente : 0;

    const ingresos = ingresoCorriente + ingresoNoCorriente;
    const egresos = egresoCorriente + egresoNoCorriente;
    const neto = ingresos - egresos;
    saldo += neto;

    return {
      ...f,
      ingresoCorriente, egresoCorriente,
      ingresoNoCorriente, egresoNoCorriente,
      egresoCuotas: incluirCompromisos ? f.egresoCuotas : 0,
      ingresos, egresos, neto, saldo,
      proyectado: true,
    };
  });
}
