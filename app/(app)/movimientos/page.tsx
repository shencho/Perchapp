import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MovimientosClient } from "./_components/movimientos-client";
import { getPlantillas } from "@/lib/supabase/actions/plantillas";
import { getPlantillasPendientesDelMes } from "@/lib/domain/plantillas";
import {
  construirOrToken, idsConDescendientes, normalizar, tokenizar,
} from "@/lib/domain/busqueda-movimientos";
import {
  cuentaEnTotales, montoParaTotales, idsAjusteInversion,
} from "@/lib/domain/finanzas";
import {
  TIPOS_MOV, METODOS, CLASIFICACIONES, FRECUENCIAS,
} from "@/lib/supabase/actions/movimientos-types";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";
import type { Persona } from "@/types/supabase";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

const PORPAGINA_OPCIONES = [25, 50, 75, 100];
const MONEDAS = ["ARS", "USD"];

/** Marcador para "no tiene" en los filtros que aceptan nulo. */
const SIN_ASIGNAR = "__sin__";

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Los filtros vienen de la URL, que cualquiera puede editar a mano. Antes se
 * pasaban crudos a la query: un `?cuenta=8f3a-` hacía que Postgres tirara 22P02,
 * supabase-js devolvía `{data:null}` y la pantalla mostraba "No hay movimientos"
 * — el usuario creía que había perdido sus datos. Un valor que no valida se
 * descarta y el filtro no se aplica.
 */
function validar(
  valor: string | undefined,
  permitidos: readonly string[],
  neutro: string,
): string {
  if (!valor || valor === neutro) return neutro;
  if (valor === SIN_ASIGNAR) return SIN_ASIGNAR;
  return permitidos.includes(valor) ? valor : neutro;
}

function validarId(
  valor: string | undefined,
  catalogo: { id: string }[],
  neutro: string,
): string {
  if (!valor || valor === neutro) return neutro;
  if (valor === SIN_ASIGNAR) return SIN_ASIGNAR;
  if (!RE_UUID.test(valor)) return neutro;
  return catalogo.some((c) => c.id === valor) ? valor : neutro;
}

export default async function MovimientosPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Mes por defecto: actual. "todos" desactiva el filtro de fecha.
  const now = new Date();
  const mesActual = params.mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const porPagina = PORPAGINA_OPCIONES.includes(Number(params.porPagina)) ? Number(params.porPagina) : 25;
  const PAGE_SIZE = porPagina;
  const todosLosMeses = mesActual === "todos";
  const q = (params.q ?? "").trim();

  const paginaPedida = Math.max(0, Number.isFinite(parseInt(params.pagina ?? "0")) ? parseInt(params.pagina ?? "0") : 0);

  // ── Paso 1: catálogos ───────────────────────────────────────────────────
  // Van antes que los movimientos porque la búsqueda y el filtro por categoría
  // necesitan resolver nombres y jerarquía ANTES de armar la query.
  //
  // Se traen SIN filtrar por archivada: un movimiento viejo puede apuntar a una
  // categoría o cuenta archivada, y si el catálogo no la incluye ese movimiento
  // se vuelve invisible para la búsqueda y para el filtro. El filtro por
  // archivada corresponde sólo donde se ofrecen opciones para dar de alta.
  const [perfilRes, cuentasRes, tarjetasRes, categoriasRes, personasRes, gruposRes, plantillas, generadosRes] =
    await Promise.all([
      supabase.from("profiles").select("nombre").eq("id", user.id).single(),
      supabase.from("cuentas").select("*").eq("user_id", user.id).order("orden"),
      supabase.from("tarjetas").select("*").eq("user_id", user.id),
      supabase.from("categorias").select("*").eq("user_id", user.id).order("nombre"),
      supabase.from("personas").select("*").eq("user_id", user.id).order("nombre"),
      supabase.from("grupos")
        .select("*, grupo_miembros(persona_id, personas(*))")
        .eq("user_id", user.id).eq("archivado", false).order("nombre"),
      getPlantillas(),
      // Qué plantillas YA generaron su movimiento este mes. Antes esto se
      // deducía de la página visible, que viene recortada por la paginación y
      // por todos los filtros: en producción ninguna de las 35 plantillas ya
      // generadas caía en las primeras 25 filas, así que la pantalla ofrecía
      // regenerar 41 movimientos que en su mayoría ya existían.
      supabase.from("movimientos")
        .select("plantilla_recurrente_id, fecha")
        .eq("user_id", user.id)
        .not("plantilla_recurrente_id", "is", null)
        .gte("fecha", `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`)
        .lte("fecha", new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)),
    ]);

  const nombreUsuario = perfilRes.data?.nombre?.split(" ")[0] ?? "Vos";
  const todasCuentas    = cuentasRes.data ?? [];
  const todasTarjetas   = tarjetasRes.data ?? [];
  const todasCategorias = categoriasRes.data ?? [];
  const todasPersonas   = (personasRes.data ?? []) as Persona[];

  // ── Paso 2: filtros validados ───────────────────────────────────────────
  const filtroTipo          = validar(params.tipo, TIPOS_MOV, "todos");
  const filtroMetodo        = validar(params.metodo, METODOS, "todos");
  const filtroClasificacion = validar(params.clasificacion, CLASIFICACIONES, "todas");
  const filtroFrecuencia    = validar(params.frecuencia, FRECUENCIAS, "todas");
  const filtroMoneda        = validar(params.moneda, MONEDAS, "todas");
  const filtroCuenta        = validarId(params.cuenta, todasCuentas, "todas");
  const filtroCategoria     = validarId(params.categoria, todasCategorias, "todas");
  const filtroTarjeta       = validarId(params.tarjeta, todasTarjetas, "todas");
  const filtroNecesidad     = validar(params.necesidad, ["1", "2", "3", "4", "5"], "todas");
  const filtroCompartido    = params.compartido === "true";

  // ── Paso 3: resolver la búsqueda contra los catálogos ───────────────────
  // Una persona no es una columna de movimientos: se llega a ella por el gasto
  // compartido o por el préstamo, así que hace falta una consulta puente.
  const tokens = tokenizar(q);
  const idsPorToken = new Map<string, string[]>();

  if (tokens.length) {
    const personasQue = new Map<string, string[]>(); // token -> persona ids
    for (const tk of tokens) {
      const ids = todasPersonas
        .filter((p) => normalizar(p.nombre).includes(normalizar(tk)))
        .map((p) => p.id);
      if (ids.length) personasQue.set(tk, ids);
    }

    if (personasQue.size) {
      const todosPersonaIds = [...new Set([...personasQue.values()].flat())];
      const [participantesRes, prestamosRes] = await Promise.all([
        supabase.from("gastos_compartidos_participantes")
          .select("movimiento_id, persona_id").in("persona_id", todosPersonaIds),
        supabase.from("prestamos").select("id, persona_id")
          .eq("user_id", user.id).in("persona_id", todosPersonaIds),
      ]);

      // persona -> movimientos, por las dos vías
      const movsPorPersona = new Map<string, string[]>();
      const push = (personaId: string | null, movId: string | null) => {
        if (!personaId || !movId) return;
        const l = movsPorPersona.get(personaId) ?? [];
        l.push(movId);
        movsPorPersona.set(personaId, l);
      };
      for (const p of participantesRes.data ?? []) push(p.persona_id, p.movimiento_id);

      const prestamos = prestamosRes.data ?? [];
      if (prestamos.length) {
        const { data: movsPrestamo } = await supabase
          .from("movimientos").select("id, prestamo_id")
          .eq("user_id", user.id).in("prestamo_id", prestamos.map((p) => p.id));
        const personaDePrestamo = new Map(prestamos.map((p) => [p.id, p.persona_id]));
        for (const m of movsPrestamo ?? []) {
          push(personaDePrestamo.get(m.prestamo_id ?? "") ?? null, m.id);
        }
      }

      for (const [tk, personaIds] of personasQue) {
        idsPorToken.set(tk, [...new Set(personaIds.flatMap((pid) => movsPorPersona.get(pid) ?? []))]);
      }
    }
  }

  // Rango de fechas del mes seleccionado (si aplica)
  let inicio: string | null = null, fin: string | null = null;
  if (!todosLosMeses) {
    const [anio, mes] = mesActual.split("-");
    inicio = `${anio}-${mes}-01`;
    fin = new Date(Number(anio), Number(mes), 0).toISOString().slice(0, 10);
  }

  // ── Paso 4: armar las queries ───────────────────────────────────────────
  const SELECT_COMPLETO = `
      *,
      categorias ( id, nombre, tipo, parent_id ),
      cuentas:cuenta_id ( id, nombre, tipo ),
      cuenta_destino:cuenta_destino_id ( id, nombre ),
      tarjetas:tarjeta_id ( id, nombre ),
      gastos_compartidos_participantes!movimiento_id ( id, estado, monto, persona_id ),
      prestamos:prestamo_id ( id, tipo, institucion_nombre, persona_id, personas ( nombre ) )
    `;

  // Los totales necesitan las mismas columnas que usa la regla de finanzas.
  const SELECT_TOTALES = "tipo, monto, moneda, categoria_id, es_compartido, gc_mi_parte, es_reembolso";

  const catalogosBusqueda = {
    categorias: todasCategorias,
    cuentas: todasCuentas,
    tarjetas: todasTarjetas,
    metodos: METODOS,
    monedas: MONEDAS,
  };

  /**
   * Aplica TODOS los filtros. Se usa igual para la página, para el count y para
   * los totales, así que las tres no pueden divergir.
   *
   * El genérico va sin restricción a propósito: describir el query builder de
   * supabase-js con un tipo recursivo (`T extends { or: (e) => T }`) hace que TS
   * corte con "type instantiation is excessively deep".
   */
  function aplicarFiltros<Q>(qy: Q): Q {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = qy as any;

    if (inicio && fin) q = q.gte("fecha", inicio).lte("fecha", fin);

    // Una llamada .or() por palabra: PostgREST las combina con AND, así que
    // "shell cafe" pide que aparezcan las dos, en cualquier orden y campo.
    for (const tk of tokens) {
      q = q.or(construirOrToken(tk, catalogosBusqueda, idsPorToken.get(tk) ?? []));
    }

    if (filtroTipo !== "todos") q = q.eq("tipo", filtroTipo);
    if (filtroClasificacion !== "todas") q = q.eq("clasificacion", filtroClasificacion);
    if (filtroFrecuencia !== "todas") q = q.eq("frecuencia", filtroFrecuencia);
    if (filtroMoneda !== "todas") q = q.eq("moneda", filtroMoneda);

    if (filtroMetodo === SIN_ASIGNAR) q = q.is("metodo", null);
    else if (filtroMetodo !== "todos") q = q.eq("metodo", filtroMetodo);

    if (filtroNecesidad === SIN_ASIGNAR) q = q.is("necesidad", null);
    else if (filtroNecesidad !== "todas") q = q.eq("necesidad", Number(filtroNecesidad));

    if (filtroTarjeta === SIN_ASIGNAR) q = q.is("tarjeta_id", null);
    else if (filtroTarjeta !== "todas") q = q.eq("tarjeta_id", filtroTarjeta);

    if (filtroCuenta === SIN_ASIGNAR) q = q.is("cuenta_id", null);
    else if (filtroCuenta !== "todas") {
      // Una transferencia toca DOS cuentas: filtrar por una tiene que traer
      // tanto lo que sale como lo que entra, si no la transferencia desaparece
      // del lado de la cuenta destino.
      q = q.or(`cuenta_id.eq.${filtroCuenta},cuenta_destino_id.eq.${filtroCuenta}`);
    }

    if (filtroCategoria === SIN_ASIGNAR) q = q.is("categoria_id", null);
    else if (filtroCategoria !== "todas") {
      // Elegir una categoría padre incluye TODA su descendencia. Con eq() plano,
      // filtrar por "Social" no traía lo cargado en "Cine".
      q = q.in("categoria_id", idsConDescendientes(filtroCategoria, todasCategorias));
    }

    if (filtroCompartido) q = q.eq("es_compartido", true);
    return q as Q;
  }

  const baseMov = () => aplicarFiltros(supabase.from("movimientos").select(SELECT_COMPLETO, { count: "exact" }).eq("user_id", user.id));

  // Primero contamos, para poder acotar la página pedida al rango válido:
  // borrar las filas de la última página dejaba al usuario en una página vacía
  // y sin controles para volver.
  const { count: totalFilas, error: errCount } = await aplicarFiltros(
    supabase.from("movimientos").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  );
  if (errCount) throw new Error(`No se pudo contar los movimientos: ${errCount.message}`);

  const total = totalFilas ?? 0;
  const ultimaPagina = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const pagina = Math.min(paginaPedida, ultimaPagina);

  const movRes = await baseMov()
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1);
  if (movRes.error) throw new Error(`No se pudieron cargar los movimientos: ${movRes.error.message}`);

  // ── Paso 5: totales del set filtrado COMPLETO ───────────────────────────
  // Un `.range()` grande no alcanza: PostgREST aplica min(limit pedido,
  // db-max-rows), así que pedir 100.000 filas no levanta el techo y los totales
  // se truncarían en silencio. Se pagina hasta agotar el count.
  const LOTE = 1000;
  const filasTotales: { tipo: string; monto: number; moneda: string; categoria_id: string | null; es_compartido: boolean | null; gc_mi_parte: number | null; es_reembolso: boolean | null }[] = [];
  for (let desde = 0; desde < total; desde += LOTE) {
    const lote = await aplicarFiltros(
      supabase.from("movimientos").select(SELECT_TOTALES).eq("user_id", user.id),
    ).range(desde, desde + LOTE - 1);
    if (lote.error) throw new Error(`No se pudieron calcular los totales: ${lote.error.message}`);
    if (!lote.data?.length) break;
    filasTotales.push(...lote.data);
  }

  // Los totales usan la MISMA regla que el inicio, estadísticas, cash-flow y
  // presupuestos: en un gasto compartido cuenta sólo tu parte, un reembolso no
  // es un ingreso nuevo y los ajustes de inversión no son movimientos reales.
  // Antes esta pantalla los sumaba crudo y daba números distintos al resto.
  const excluir = idsAjusteInversion(todasCategorias);
  const totales: Record<string, { ingreso: number; egreso: number }> = {};
  for (const m of filasTotales) {
    if (!cuentaEnTotales(m, excluir)) continue;
    const cur = (totales[m.moneda] ??= { ingreso: 0, egreso: 0 });
    const monto = montoParaTotales(m);
    if (m.tipo === "Ingreso") cur.ingreso += monto;
    else if (m.tipo === "Egreso") cur.egreso += monto;
  }

  const grupos: GrupoConMiembros[] = (gruposRes.data ?? []).map((g) => ({
    ...g,
    miembros: (g.grupo_miembros as { persona_id: string; personas: Persona | null }[])
      .map((m) => m.personas)
      .filter((p): p is Persona => p !== null),
  }));

  const plantillasPendientes = getPlantillasPendientesDelMes(
    plantillas,
    (generadosRes.data ?? []).map((m) => ({
      plantilla_recurrente_id: m.plantilla_recurrente_id ?? null,
      fecha: m.fecha,
    })),
    now,
  );

  return (
    <MovimientosClient
      movimientos={(movRes.data ?? []) as Parameters<typeof MovimientosClient>[0]["movimientos"]}
      total={total}
      totales={totales}
      pagina={pagina}
      porPagina={porPagina}
      busquedaInicial={q}
      tipoInicial={filtroTipo}
      metodoInicial={filtroMetodo}
      cuentaInicial={filtroCuenta}
      categoriaInicial={filtroCategoria}
      tarjetaInicial={filtroTarjeta}
      necesidadInicial={filtroNecesidad}
      clasificacionInicial={filtroClasificacion}
      frecuenciaInicial={filtroFrecuencia}
      monedaInicial={filtroMoneda}
      monedas={MONEDAS}
      cuentas={todasCuentas}
      tarjetas={todasTarjetas}
      categorias={todasCategorias}
      personas={todasPersonas.filter((p) => !p.archivado)}
      grupos={grupos}
      mesActual={mesActual}
      compartidoInicial={filtroCompartido}
      nombreUsuario={nombreUsuario}
      plantillasPendientes={plantillasPendientes}
      generarInicialId={params.generar}
    />
  );
}
