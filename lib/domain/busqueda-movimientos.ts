/**
 * Búsqueda libre de movimientos.
 *
 * Antes era `concepto.ilike OR descripcion.ilike`, con tres agujeros:
 *
 *  1. Buscar "cine" no traía nada, porque Cine es el nombre de una CATEGORÍA y
 *     no aparece en ninguno de esos dos campos. Lo mismo con el nombre de una
 *     cuenta, de una tarjeta o de una persona.
 *  2. `ilike` no ignora acentos: "cafe" no encontraba "Café". Y como los datos
 *     tienen las dos grafías conviviendo, ninguna de las dos búsquedas traía el
 *     total. Lo resuelve la columna generada `movimientos.busqueda`
 *     (migración 034), que guarda el texto libre sin acentos y en minúscula.
 *  3. Todo el término iba como un único substring, así que "shell cafe" no
 *     encontraba "Café Shell": las palabras tenían que estar pegadas y en ese
 *     orden.
 *
 * Ahora el término se parte en palabras y CADA UNA tiene que aparecer en algún
 * lado (semántica AND entre palabras, OR entre campos), que es lo que espera
 * cualquiera que use un buscador.
 */

export interface CategoriaBusqueda {
  id: string;
  nombre: string;
  parent_id: string | null;
}

export interface EntidadBusqueda {
  id: string;
  nombre: string;
}

export interface CatalogosBusqueda {
  categorias: CategoriaBusqueda[];
  cuentas: EntidadBusqueda[];
  tarjetas: EntidadBusqueda[];
  /** Valores posibles de `metodo` (constante METODOS). */
  metodos?: readonly string[];
  /** Monedas en uso, p. ej. ["ARS", "USD"]. */
  monedas?: readonly string[];
}

/**
 * Ids de una categoría y TODA su descendencia.
 *
 * El filtro por categoría usaba `eq(categoria_id, id)`, que sobre una categoría
 * padre devuelve sólo los movimientos cargados directo en el padre. En
 * producción el 75% de los movimientos vive en subcategorías, así que elegir
 * "Social" escondía casi todo lo de Social.
 */
export function idsConDescendientes(
  raizId: string,
  categorias: CategoriaBusqueda[],
): string[] {
  const hijosPorPadre = new Map<string, string[]>();
  for (const c of categorias) {
    if (!c.parent_id) continue;
    const lista = hijosPorPadre.get(c.parent_id) ?? [];
    lista.push(c.id);
    hijosPorPadre.set(c.parent_id, lista);
  }

  const out: string[] = [];
  const vistos = new Set<string>();
  const pila = [raizId];
  while (pila.length) {
    const id = pila.pop()!;
    if (vistos.has(id)) continue; // corta ciclos de datos mal formados
    vistos.add(id);
    out.push(id);
    pila.push(...(hijosPorPadre.get(id) ?? []));
  }
  return out;
}

/** Normaliza para comparar sin acentos ni mayúsculas ("cafe" encuentra "Café"). */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Parte el término en palabras. Cada una tendrá que matchear en algún campo. */
export function tokenizar(termino: string): string[] {
  return termino.trim().split(/\s+/).filter(Boolean);
}

/**
 * Prepara un valor para meterlo entre comillas dobles en un `.or()` de PostgREST
 * como patrón de LIKE.
 *
 * Son dos escapes encadenados y el orden importa:
 *  1. `%` y `_` son comodines de LIKE. Sin escapar, buscar "50%" devolvía
 *     "Nafta 1500 litros", que no tiene ningún porcentaje.
 *  2. Después hay que escapar la barra y la comilla para PostgREST, que es
 *     quien parsea el valor entre comillas.
 *
 * Nota: PostgREST traduce `*` a `%` antes de llegar a Postgres, así que un
 * asterisco tipeado por el usuario funciona como comodín. Se deja a propósito.
 */
export function patronLike(termino: string): string {
  const conEscapeLike = termino.replace(/[\\%_]/g, (m) => `\\${m}`);
  return conEscapeLike.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Cuántos ids como máximo se embuten en un `in.()` antes de que la URL moleste. */
const MAX_IDS = 300;

function listaIn(campo: string, ids: string[]): string | null {
  if (!ids.length) return null;
  return `${campo}.in.(${ids.slice(0, MAX_IDS).join(",")})`;
}

/**
 * Arma la expresión `.or()` de PostgREST para UNA palabra del término.
 *
 * `idsMovimiento` suma movimientos encontrados por una vía que no sale de los
 * catálogos (hoy: participantes de un gasto compartido y préstamos de una
 * persona), porque la persona no es una columna de `movimientos`.
 */
export function construirOrToken(
  token: string,
  catalogos: CatalogosBusqueda,
  idsMovimiento: string[] = [],
): string {
  const norm = normalizar(token);
  const coincide = (nombre: string) => normalizar(nombre).includes(norm);

  const partes: (string | null)[] = [
    // Columna generada por la migración 034: concepto + descripcion +
    // observaciones, sin acentos y en minúscula. `observaciones` nunca se
    // buscaba y es texto que el usuario carga a mano.
    `busqueda.like."%${patronLike(norm)}%"`,
  ];

  // Categorías: si el término pega en una categoría padre, entran también sus
  // subcategorías (buscar "Social" tiene que traer lo de "Cine").
  const catIds = new Set<string>();
  for (const c of catalogos.categorias.filter((c) => coincide(c.nombre))) {
    for (const id of idsConDescendientes(c.id, catalogos.categorias)) catIds.add(id);
  }
  partes.push(listaIn("categoria_id", [...catIds]));

  // Cuentas: una transferencia toca DOS cuentas, origen y destino.
  const cuentaIds = catalogos.cuentas.filter((c) => coincide(c.nombre)).map((c) => c.id);
  partes.push(listaIn("cuenta_id", cuentaIds));
  partes.push(listaIn("cuenta_destino_id", cuentaIds));

  partes.push(listaIn("tarjeta_id", catalogos.tarjetas.filter((t) => coincide(t.nombre)).map((t) => t.id)));

  // Método y moneda salen de listas conocidas: se resuelven acá en vez de con
  // un ilike, así "credito" (sin tilde) encuentra "Crédito".
  for (const m of (catalogos.metodos ?? []).filter(coincide)) partes.push(`metodo.eq."${m}"`);
  for (const m of (catalogos.monedas ?? []).filter(coincide)) partes.push(`moneda.eq."${m}"`);

  // Monto exacto: buscar "400000" tiene que encontrar el gasto de $400.000.
  const numero = Number(token.replace(/[.\s$]/g, "").replace(",", "."));
  if (Number.isFinite(numero) && numero !== 0) partes.push(`monto.eq.${numero}`);

  partes.push(listaIn("id", idsMovimiento));

  return partes.filter((p): p is string => p !== null).join(",");
}
