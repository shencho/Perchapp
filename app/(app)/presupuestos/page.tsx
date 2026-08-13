import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPresupuestos } from "@/lib/supabase/actions/presupuestos";
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
    supabase.from("categorias").select("id, nombre, tipo, parent_id").eq("user_id", user.id).eq("archivada", false).order("nombre"),
    getPresupuestos(anioMes).catch(() => []),
    supabase.from("movimientos")
      .select("monto, moneda, categoria_id")
      .eq("user_id", user.id).eq("tipo", "Egreso").eq("moneda", "ARS")
      .gte("fecha", inicio).lte("fecha", fin),
  ]);

  const categorias = categoriasRaw ?? [];
  // Categorías padre de egreso (donde se cargan presupuestos)
  const catsPadre = categorias.filter((c) => !c.parent_id && (c.tipo === "Egreso" || c.tipo === "Ambos"));
  // Mapa categoria_id → categoría padre (para atribuir el gasto)
  const parentDe = new Map<string, string>();
  for (const c of categorias) parentDe.set(c.id, c.parent_id ?? c.id);

  // Gastado del mes por categoría padre (ARS)
  const gastadoPorCat: Record<string, number> = {};
  for (const mv of (movRaw ?? []) as { monto: number; categoria_id: string | null }[]) {
    const padre = mv.categoria_id ? (parentDe.get(mv.categoria_id) ?? mv.categoria_id) : "__sin__";
    gastadoPorCat[padre] = (gastadoPorCat[padre] ?? 0) + mv.monto;
  }

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
