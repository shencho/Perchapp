import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MovimientosClient } from "./_components/movimientos-client";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";
import type { Persona } from "@/types/supabase";

interface Props {
  searchParams: Promise<{ mes?: string; pagina?: string }>;
}

export default async function MovimientosPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Mes por defecto: actual
  const now = new Date();
  const mesActual = params.mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pagina = parseInt(params.pagina ?? "0");
  const PAGE_SIZE = 25;

  const [anio, mes] = mesActual.split("-");
  const inicio = `${anio}-${mes}-01`;
  const fin = new Date(Number(anio), Number(mes), 0).toISOString().slice(0, 10);

  // Cargar movimientos + relaciones + datos de filtros en paralelo
  const [movRes, cuentasRes, tarjetasRes, categoriasRes, clientesRes, personasRes, gruposRes] = await Promise.all([
    supabase
      .from("movimientos")
      .select(`
        *,
        categorias ( id, nombre, tipo, parent_id ),
        cuentas:cuenta_id ( id, nombre, tipo ),
        cuenta_destino:cuenta_destino_id ( id, nombre ),
        tarjetas:tarjeta_id ( id, nombre ),
        clientes:cliente_id ( id, nombre ),
        servicios_cliente:servicio_id ( id, nombre ),
        gastos_compartidos_participantes!movimiento_id ( id, estado, monto )
      `, { count: "exact" })
      .eq("user_id", user.id)
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1),
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
  ]);

  const grupos: GrupoConMiembros[] = (gruposRes.data ?? []).map((g) => ({
    ...g,
    miembros: (g.grupo_miembros as { persona_id: string; personas: Persona | null }[])
      .map((m) => m.personas)
      .filter((p): p is Persona => p !== null),
  }));

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
    />
  );
}
