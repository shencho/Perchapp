import { montoParaTotales, cuentaEnTotales, type MovimientoFinanzas } from "./finanzas";

/**
 * Agrupación por categoría CONSERVANDO las subcategorías.
 *
 * El rollup padre/hijo estaba copiado en tres pantallas con criterios
 * distintos, y las tres colapsaban los hijos y tiraban el detalle. Acá se
 * agrupa una sola vez y se devuelven los hijos anidados, que es lo que
 * permite desplegar una categoría y ver de qué se compone.
 */

export interface CategoriaBase {
  id: string;
  nombre: string;
  parent_id: string | null;
}

export interface Jerarquia {
  /** id (de cualquier nivel) → id de su categoría padre (o sí misma si es padre). */
  padreDe: Map<string, string>;
  nombreDe: Map<string, string>;
}

export const SIN_CATEGORIA = "__sin__";

export function buildJerarquia(categorias: CategoriaBase[]): Jerarquia {
  return {
    padreDe: new Map(categorias.map((c) => [c.id, c.parent_id ?? c.id])),
    nombreDe: new Map(categorias.map((c) => [c.id, c.nombre])),
  };
}

export interface FilaCategoria {
  id: string;
  nombre: string;
  monto: number;
  porcentaje: number;
  hijos: { id: string; nombre: string; monto: number; porcentaje: number }[];
}

export interface ResumenCategorias {
  total: number;
  filas: FilaCategoria[];
}

/**
 * Agrupa por categoría padre y deja los hijos adentro, ordenados por monto.
 * `porcentaje` de un padre es sobre el total; el de un hijo, sobre su padre.
 */
export function agruparPorCategoria(
  movimientos: MovimientoFinanzas[],
  jerarquia: Jerarquia,
  opts: { tipo: "Ingreso" | "Egreso"; excluirCategorias?: string[] } = { tipo: "Egreso" },
): ResumenCategorias {
  const { tipo, excluirCategorias = [] } = opts;
  const { padreDe, nombreDe } = jerarquia;

  // padreId → { monto, hijos: hijoId → monto }
  const acc = new Map<string, { monto: number; hijos: Map<string, number> }>();
  let total = 0;

  for (const m of movimientos) {
    if (m.tipo !== tipo) continue;
    if (!cuentaEnTotales(m, excluirCategorias)) continue;

    const monto = montoParaTotales(m);
    total += monto;

    const propia = m.categoria_id ?? SIN_CATEGORIA;
    const padre = m.categoria_id ? (padreDe.get(m.categoria_id) ?? m.categoria_id) : SIN_CATEGORIA;

    const entry = acc.get(padre) ?? { monto: 0, hijos: new Map<string, number>() };
    entry.monto += monto;
    // Sólo se anida si el movimiento apunta a una SUBcategoría.
    if (propia !== padre) entry.hijos.set(propia, (entry.hijos.get(propia) ?? 0) + monto);
    acc.set(padre, entry);
  }

  const pct = (parte: number, sobre: number) => (sobre > 0 ? Math.round((parte / sobre) * 100) : 0);

  const filas: FilaCategoria[] = [...acc.entries()]
    .map(([id, { monto, hijos }]) => ({
      id,
      nombre: id === SIN_CATEGORIA ? "Sin categoría" : (nombreDe.get(id) ?? "Sin categoría"),
      monto,
      porcentaje: pct(monto, total),
      hijos: [...hijos.entries()]
        .map(([hid, hmonto]) => ({
          id: hid,
          nombre: nombreDe.get(hid) ?? "Sin categoría",
          monto: hmonto,
          porcentaje: pct(hmonto, monto),
        }))
        .sort((a, b) => b.monto - a.monto),
    }))
    .sort((a, b) => b.monto - a.monto);

  return { total, filas };
}
