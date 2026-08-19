import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { montoPropio } from "@/lib/domain/_utils/movimiento";
import { EstadisticasClient } from "./_components/estadisticas-client";

interface Props {
  searchParams: Promise<{ mes?: string }>;
}

export default async function EstadisticasPage({ searchParams }: Props) {
  const { mes } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const anioMes = mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = anioMes.split("-").map(Number);
  const inicio = `${anioMes}-01`;
  const fin = `${anioMes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const [{ data: movRaw }, { data: categoriasRaw }] = await Promise.all([
    supabase.from("movimientos")
      .select("tipo, monto, moneda, categoria_id, es_compartido, gc_mi_parte")
      .eq("user_id", user.id)
      .eq("moneda", "ARS")
      .neq("tipo", "Transferencia")
      .gte("fecha", inicio).lte("fecha", fin),
    supabase.from("categorias")
      .select("id, nombre, parent_id")
      .eq("user_id", user.id),
  ]);

  const movimientos = movRaw ?? [];
  const categorias = categoriasRaw ?? [];
  const nombreDe = new Map(categorias.map((c) => [c.id, c.nombre]));
  // Las subcategorías se agrupan bajo su categoría padre.
  const padreDe = new Map(categorias.map((c) => [c.id, c.parent_id ?? c.id]));

  function agrupar(tipo: "Ingreso" | "Egreso") {
    const delTipo = movimientos.filter((mv) => mv.tipo === tipo);
    // Para egresos se usa la parte propia (en gastos compartidos, no el total).
    const montoDe = (mv: (typeof delTipo)[number]) =>
      tipo === "Egreso" ? montoPropio(mv) : mv.monto;

    const porCat: Record<string, number> = {};
    for (const mv of delTipo) {
      const padre = mv.categoria_id ? (padreDe.get(mv.categoria_id) ?? mv.categoria_id) : "__sin__";
      porCat[padre] = (porCat[padre] ?? 0) + montoDe(mv);
    }
    const total = delTipo.reduce((acc, mv) => acc + montoDe(mv), 0);

    const categoriasOrdenadas = Object.entries(porCat)
      .map(([id, monto]) => ({
        id,
        nombre: id === "__sin__" ? "Sin categoría" : (nombreDe.get(id) ?? "Sin categoría"),
        monto,
        porcentaje: total > 0 ? Math.round((monto / total) * 100) : 0,
      }))
      .sort((a, b) => b.monto - a.monto);

    return { total, categorias: categoriasOrdenadas };
  }

  return (
    <EstadisticasClient
      anioMes={anioMes}
      ingresos={agrupar("Ingreso")}
      egresos={agrupar("Egreso")}
    />
  );
}
