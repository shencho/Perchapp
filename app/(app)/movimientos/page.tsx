import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MovimientosClient } from "./_components/movimientos-client";
import { getPlantillas } from "@/lib/supabase/actions/plantillas";
import { getPlantillasPendientesDelMes } from "@/lib/domain/plantillas";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";
import type { Persona } from "@/types/supabase";

interface Props {
  searchParams: Promise<{ mes?: string; pagina?: string; compartido?: string; generar?: string }>;
}

export default async function MovimientosPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Mes por defecto: actual. "todos" desactiva el filtro de fecha.
  const now = new Date();
  const mesActual = params.mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pagina = parseInt(params.pagina ?? "0");
  const PAGE_SIZE = 25;
  const todosLosMeses = mesActual === "todos";

  // Nombre del usuario (para resolver "Vos" en balance grupal)
  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre")
    .eq("id", user.id)
    .single();
  const nombreUsuario = perfil?.nombre?.split(" ")[0] ?? "Vos";

  // Construir query de movimientos con filtro de fecha opcional
  let movQuery = supabase
    .from("movimientos")
    .select(`
      *,
      categorias ( id, nombre, tipo, parent_id ),
      cuentas:cuenta_id ( id, nombre, tipo ),
      cuenta_destino:cuenta_destino_id ( id, nombre ),
      tarjetas:tarjeta_id ( id, nombre ),
      clientes:cliente_id ( id, nombre ),
      servicios_cliente:servicio_id ( id, nombre ),
      gastos_compartidos_participantes!movimiento_id ( id, estado, monto ),
      prestamos:prestamo_id ( id, tipo, institucion_nombre, persona_id, personas ( nombre ) )
    `, { count: "exact" })
    .eq("user_id", user.id);

  if (!todosLosMeses) {
    const [anio, mes] = mesActual.split("-");
    const inicio = `${anio}-${mes}-01`;
    const fin = new Date(Number(anio), Number(mes), 0).toISOString().slice(0, 10);
    movQuery = movQuery.gte("fecha", inicio).lte("fecha", fin);
  }

  movQuery = movQuery
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1);

  // Cargar movimientos + relaciones + datos de filtros + plantillas en paralelo
  const [movRes, cuentasRes, tarjetasRes, categoriasRes, clientesRes, personasRes, gruposRes, plantillas] = await Promise.all([
    movQuery,
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
      .from("clientes")
      .select("id, nombre")
      .eq("user_id", user.id)
      .eq("archivado", false)
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

  return (
    <MovimientosClient
      movimientos={(movRes.data ?? []) as Parameters<typeof MovimientosClient>[0]["movimientos"]}
      total={movRes.count ?? 0}
      cuentas={cuentasRes.data ?? []}
      tarjetas={tarjetasRes.data ?? []}
      categorias={categoriasRes.data ?? []}
      clientes={(clientesRes.data ?? []) as { id: string; nombre: string }[]}
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
