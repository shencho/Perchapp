import { toLocalISO } from "./_utils/dates";

/**
 * Períodos mensuales: parseo, rangos y navegación.
 *
 * Existía copiado en tres pantallas (estadísticas, movimientos, presupuestos),
 * cada una con su propio criterio, y ninguna validaba el parámetro. Con
 * `?mes=2025-99` estadísticas renderizaba un mes inventado, porque
 * `new Date(2025, 99, 0)` no falla: rolea en silencio hasta 2033.
 *
 * Todo usa hora local vía `toLocalISO`. Con `toISOString().slice(0,10)`, en
 * UTC-3 el primer día del mes se convierte en el último del mes anterior.
 */

/** "YYYY-MM" */
export type AnioMes = string;

const RE_ANIO_MES = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function anioMesDe(fecha: Date): AnioMes {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

/** Parsea un searchParam. Cualquier cosa que no valide cae al mes de `hoy`. */
export function parseAnioMes(raw: string | undefined, hoy: Date = new Date()): AnioMes {
  if (raw && RE_ANIO_MES.test(raw)) return raw;
  return anioMesDe(hoy);
}

function partes(anioMes: AnioMes): { anio: number; mes: number } {
  const m = RE_ANIO_MES.exec(anioMes);
  if (!m) throw new Error(`Mes inválido: ${anioMes}`);
  return { anio: Number(m[1]), mes: Number(m[2]) - 1 };
}

/** Corre N meses (negativo hacia atrás). JS ya maneja el desborde de año. */
export function desplazarMes(anioMes: AnioMes, delta: number): AnioMes {
  const { anio, mes } = partes(anioMes);
  return anioMesDe(new Date(anio, mes + delta, 1));
}

export interface RangoMes {
  /** Primer día del mes, YYYY-MM-DD. */
  inicio: string;
  /** Último día del mes, YYYY-MM-DD. */
  fin: string;
  anterior: AnioMes;
  siguiente: AnioMes;
}

export function rangoMes(anioMes: AnioMes): RangoMes {
  const { anio, mes } = partes(anioMes);
  return {
    inicio: toLocalISO(new Date(anio, mes, 1)),
    // Día 0 del mes siguiente = último día de éste, sin importar febrero.
    fin: toLocalISO(new Date(anio, mes + 1, 0)),
    anterior: desplazarMes(anioMes, -1),
    siguiente: desplazarMes(anioMes, 1),
  };
}

/**
 * Ventana de `cantidad` meses que TERMINA en `anioMes`. Para el selector de
 * rango de estadísticas: `rangoDeMeses("2026-09", 3)` va del 1-jul al 30-sep.
 */
export function rangoDeMeses(anioMes: AnioMes, cantidad: number): { inicio: string; fin: string } {
  const n = Math.max(1, Math.floor(cantidad));
  return {
    inicio: rangoMes(desplazarMes(anioMes, -(n - 1))).inicio,
    fin: rangoMes(anioMes).fin,
  };
}

export function esMesActual(anioMes: AnioMes, hoy: Date = new Date()): boolean {
  return anioMes === anioMesDe(hoy);
}

/** "sep 2026" */
export function labelMes(anioMes: AnioMes): string {
  const { anio, mes } = partes(anioMes);
  return new Date(anio, mes, 15)
    .toLocaleDateString("es-AR", { month: "short", year: "numeric" })
    .replace(".", "");
}

/**
 * Acota la navegación. Sin tope el usuario puede llegar a 1998 y cada paso
 * atrás agranda la ventana de movimientos que se trae.
 */
export function acotarMes(
  anioMes: AnioMes,
  hoy: Date = new Date(),
  mesesAtras = 36,
): AnioMes {
  const tope = anioMesDe(hoy);
  const piso = desplazarMes(tope, -mesesAtras);
  if (anioMes > tope) return tope;
  if (anioMes < piso) return piso;
  return anioMes;
}
