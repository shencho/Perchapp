import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MovimientosClient } from "./_components/movimientos-client";

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
  const [movRes, cuentasRes, tarjetasRes, categoriasRes] = await Promise.all([
    supabase
      .from("movimientos")
      .select(`
        *,
        categorias ( id, nombre, tipo, parent_id ),
        cuentas:cuenta_id ( id, nombre, tipo ),
        cuenta_destino:cuenta_destino_id ( id, nombre ),
        tarjetas:tarjeta_id ( id, nombre )
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
  ]);

  return (
    <MovimientosClient
      movimientos={(movRes.data ?? []) as Parameters<typeof MovimientosClient>[0]["movimientos"]}
      total={movRes.count ?? 0}
      cuentas={cuentasRes.data ?? []}
      tarjetas={tarjetasRes.data ?? []}
      categorias={categoriasRes.data ?? []}
      mesActual={mesActual}
    />
  );
}
