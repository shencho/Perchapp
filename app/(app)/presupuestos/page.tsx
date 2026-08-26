import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPresupuestos } from "@/lib/supabase/actions/presupuestos";
import { buildJerarquia, agruparPorCategoria } from "@/lib/domain/categorias";
import { idsAjusteInversion } from "@/lib/domain/finanzas";
import { PresupuestosClient } from "./_components/presupuestos-client";

interface Props {
  searchParams: Promise<{ mes?: string }>;
}

export default async function PresupuestosPage({ searchParams }: Props) {
  const { mes } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const anioMes = mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const inicio = `${anioMes}-01`;
  const [y, m] = anioMes.split("-").map(Number);
  const fin = new Date(y, m, 0).toISOString().slice(0, 10);

  const [{ data: categoriasRaw }, presupuestos, { data: movRaw }] = await Promise.all([
    // Completo: la jerarquía tiene que poder atribuir a su padre el gasto de una
    // subcategoría archivada. Con el catálogo recortado esa plata quedaba en una
    // fila huérfana que la pantalla no dibuja, así que la barra del padre
    // mostraba menos gasto del real y el usuario veía presupuesto que no tenía.
    supabase.from("categorias").select("id, nombre, tipo, parent_id, archivada").eq("user_id", user.id).order("nombre"),
    getPresupuestos(anioMes).catch(() => []),
    supabase.from("movimientos")
      .select("tipo, monto, moneda, categoria_id, es_compartido, gc_mi_parte, es_reembolso")
      .eq("user_id", user.id).eq("tipo", "Egreso").eq("moneda", "ARS")
      .gte("fecha", inicio).lte("fecha", fin),
  ]);

  const categorias = categoriasRaw ?? [];
  // Categorías padre de egreso (donde se cargan presupuestos)
  // Para EDITAR el presupuesto sólo se ofrecen las activas.
  const catsPadre = categorias.filter((c) => !c.parent_id && !c.archivada && (c.tipo === "Egreso" || c.tipo === "Ambos"));
  // Mapa categoria_id → categoría padre (para atribuir el gasto)

  // Gastado del mes por categoría padre (ARS), con el criterio único: en un
  // gasto compartido cuenta sólo tu parte. Antes sumaba el monto total, así
  // que el presupuesto se "consumía" con plata que no era tuya.
  const resumenGasto = agruparPorCategoria(movRaw ?? [], buildJerarquia(categorias), {
    tipo: "Egreso",
    excluirCategorias: idsAjusteInversion(categorias),
  });
  const gastadoPorCat: Record<string, number> = Object.fromEntries(
    resumenGasto.filas.map((f) => [f.id, f.monto]),
  );

  const presupuestoPorCat: Record<string, number> = {};
  for (const p of presupuestos) presupuestoPorCat[p.categoria_id] = p.monto;

  return (
    <PresupuestosClient
      anioMes={anioMes}
      categorias={catsPadre.map((c) => ({ id: c.id, nombre: c.nombre }))}
      presupuestoPorCat={presupuestoPorCat}
      gastadoPorCat={gastadoPorCat}
    />
  );
}
