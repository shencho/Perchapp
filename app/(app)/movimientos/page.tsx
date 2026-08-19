import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MovimientosClient } from "./_components/movimientos-client";
import { getPlantillas } from "@/lib/supabase/actions/plantillas";
import { getPlantillasPendientesDelMes } from "@/lib/domain/plantillas";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";
import type { Persona } from "@/types/supabase";

interface Props {
  searchParams: Promise<{ mes?: string; pagina?: string; compartido?: string; generar?: string; q?: string; porPagina?: string; tipo?: string; metodo?: string; cuenta?: string; categoria?: string }>;
}

const PORPAGINA_OPCIONES = [25, 50, 75, 100];

export default async function MovimientosPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Mes por defecto: actual. "todos" desactiva el filtro de fecha.
  const now = new Date();
  const mesActual = params.mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pagina = parseInt(params.pagina ?? "0");
  const porPagina = PORPAGINA_OPCIONES.includes(Number(params.porPagina)) ? Number(params.porPagina) : 25;
  const PAGE_SIZE = porPagina;
  const todosLosMeses = mesActual === "todos";
  const q = (params.q ?? "").trim();
  // Sanear para el .or() de PostgREST (coma y paréntesis rompen la sintaxis).
  const qOr = q.replace(/[,()]/g, " ");

  // Filtros (server-side, así la búsqueda y los totales abarcan TODO el set, no la página).
  const filtroTipo      = params.tipo ?? "todos";
  const filtroMetodo    = params.metodo ?? "todos";
  const filtroCuenta    = params.cuenta ?? "todas";
  const filtroCategoria = params.categoria ?? "todas";
  const filtroCompartido = params.compartido === "true";

  // Nombre del usuario (para resolver "Vos" en balance grupal)
  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre")
    .eq("id", user.id)
    .single();
  const nombreUsuario = perfil?.nombre?.split(" ")[0] ?? "Vos";

  // Rango de fechas del mes seleccionado (si aplica)
  let inicio: string | null = null, fin: string | null = null;
  if (!todosLosMeses) {
    const [anio, mes] = mesActual.split("-");
    inicio = `${anio}-${mes}-01`;
    fin = new Date(Number(anio), Number(mes), 0).toISOString().slice(0, 10);
  }

  // Query principal (página actual) — con relaciones y count exacto.
  let movQuery = supabase
    .from("movimientos")
    .select(`
      *,
      categorias ( id, nombre, tipo, parent_id ),
      cuentas:cuenta_id ( id, nombre, tipo ),
      cuenta_destino:cuenta_destino_id ( id, nombre ),
      tarjetas:tarjeta_id ( id, nombre ),
      gastos_compartidos_participantes!movimiento_id ( id, estado, monto, persona_id ),
      prestamos:prestamo_id ( id, tipo, institucion_nombre, persona_id, personas ( nombre ) )
    `, { count: "exact" })
    .eq("user_id", user.id);

  // Query de totales — TODO el set filtrado (sin paginar), solo columnas mínimas.
  let totalesQuery = supabase
    .from("movimientos")
    .select("tipo, monto, moneda")
    .eq("user_id", user.id);

  if (inicio && fin) {
    movQuery = movQuery.gte("fecha", inicio).lte("fecha", fin);
    totalesQuery = totalesQuery.gte("fecha", inicio).lte("fecha", fin);
  }
  if (qOr) {
    const orExpr = `concepto.ilike.%${qOr}%,descripcion.ilike.%${qOr}%`;
    movQuery = movQuery.or(orExpr);
    totalesQuery = totalesQuery.or(orExpr);
  }
  if (filtroTipo !== "todos") {
    movQuery = movQuery.eq("tipo", filtroTipo); totalesQuery = totalesQuery.eq("tipo", filtroTipo);
  }
  if (filtroMetodo !== "todos") {
    movQuery = movQuery.eq("metodo", filtroMetodo); totalesQuery = totalesQuery.eq("metodo", filtroMetodo);
  }
  if (filtroCuenta !== "todas") {
    movQuery = movQuery.eq("cuenta_id", filtroCuenta); totalesQuery = totalesQuery.eq("cuenta_id", filtroCuenta);
  }
  if (filtroCategoria !== "todas") {
    movQuery = movQuery.eq("categoria_id", filtroCategoria); totalesQuery = totalesQuery.eq("categoria_id", filtroCategoria);
  }
  if (filtroCompartido) {
    movQuery = movQuery.eq("es_compartido", true); totalesQuery = totalesQuery.eq("es_compartido", true);
  }

  movQuery = movQuery
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1);

  // Cargar movimientos + relaciones + datos de filtros + plantillas en paralelo
  const [movRes, totalesRes, cuentasRes, tarjetasRes, categoriasRes, personasRes, gruposRes, plantillas] = await Promise.all([
    movQuery,
    totalesQuery,
    supabase
      .from("cuentas")
      .select("*")
      .eq("user_id", user.id)
      .eq("archivada", false)
      .order("orden"),
    supabase
      .from("tarjetas")
      .select("*")
      .eq("user_id", user.id)
      .eq("archivada", false),
    supabase
      .from("categorias")
      .select("*")
      .eq("user_id", user.id)
      .eq("archivada", false)
      .order("nombre"),
    supabase
      .from("personas")
      .select("*")
      .eq("user_id", user.id)
      .eq("archivado", false)
      .order("nombre"),
    supabase
      .from("grupos")
      .select("*, grupo_miembros(persona_id, personas(*))")
      .eq("user_id", user.id)
      .eq("archivado", false)
      .order("nombre"),
    getPlantillas(),
  ]);

  const grupos: GrupoConMiembros[] = (gruposRes.data ?? []).map((g) => ({
    ...g,
    miembros: (g.grupo_miembros as { persona_id: string; personas: Persona | null }[])
      .map((m) => m.personas)
      .filter((p): p is Persona => p !== null),
  }));

  // Plantillas pendientes del mes actual (check contra movimientos ya cargados)
  const movsParaCheck = (movRes.data ?? []).map(m => ({
    plantilla_recurrente_id: m.plantilla_recurrente_id ?? null,
    fecha: m.fecha,
  }));
  // Si el filtro es por mes distinto al actual, igual chequeamos contra todos los movimientos del mes actual
  const ahora = new Date();
  const inicioMesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-01`;
  const finMesActual    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    .toISOString().slice(0, 10);
  const movsEsteMes = todosLosMeses
    ? movsParaCheck.filter(m => m.fecha >= inicioMesActual && m.fecha <= finMesActual)
    : movsParaCheck;

  const plantillasPendientes = getPlantillasPendientesDelMes(plantillas, movsEsteMes, ahora);

  // Totales del set filtrado completo, por moneda (Ingreso/Egreso).
  const totales: Record<string, { ingreso: number; egreso: number }> = {};
  for (const m of (totalesRes.data ?? []) as { tipo: string; monto: number; moneda: string }[]) {
    const cur = (totales[m.moneda] ??= { ingreso: 0, egreso: 0 });
    if (m.tipo === "Ingreso") cur.ingreso += m.monto;
    else if (m.tipo === "Egreso") cur.egreso += m.monto;
  }

  return (
    <MovimientosClient
      movimientos={(movRes.data ?? []) as Parameters<typeof MovimientosClient>[0]["movimientos"]}
      total={movRes.count ?? 0}
      totales={totales}
      pagina={pagina}
      porPagina={porPagina}
      busquedaInicial={q}
      tipoInicial={filtroTipo}
      metodoInicial={filtroMetodo}
      cuentaInicial={filtroCuenta}
      categoriaInicial={filtroCategoria}
      cuentas={cuentasRes.data ?? []}
      tarjetas={tarjetasRes.data ?? []}
      categorias={categoriasRes.data ?? []}
      personas={(personasRes.data ?? []) as Persona[]}
      grupos={grupos}
      mesActual={mesActual}
      compartidoInicial={params.compartido === "true"}
      nombreUsuario={nombreUsuario}
      plantillasPendientes={plantillasPendientes}
      generarInicialId={params.generar}
    />
  );
}
