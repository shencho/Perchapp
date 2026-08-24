import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { idsAjusteInversion, totalesPorMoneda } from "@/lib/domain/finanzas";
import { buildJerarquia, agruparPorCategoria } from "@/lib/domain/categorias";
import { EstadisticasClient } from "./_components/estadisticas-client";

const MONEDAS = ["ARS", "USD"];

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
    // Sin filtro de moneda: antes se pedía sólo ARS y el USD era invisible.
    supabase.from("movimientos")
      .select("tipo, monto, moneda, categoria_id, es_compartido, gc_mi_parte, es_reembolso")
      .eq("user_id", user.id)
      .neq("tipo", "Transferencia")
      .gte("fecha", inicio).lte("fecha", fin),
    supabase.from("categorias")
      .select("id, nombre, parent_id")
      .eq("user_id", user.id),
  ]);

  const movimientos = movRaw ?? [];
  const categorias = categoriasRaw ?? [];
  const excluir = idsAjusteInversion(categorias);
  const jerarquia = buildJerarquia(categorias);

  const totales = totalesPorMoneda(movimientos, { excluirCategorias: excluir, monedas: MONEDAS });

  // Un desglose por moneda y tipo, con las subcategorías anidadas.
  const porMoneda = Object.fromEntries(
    MONEDAS.map((moneda) => {
      const delMes = movimientos.filter((mv) => mv.moneda === moneda);
      return [moneda, {
        ingresos: agruparPorCategoria(delMes, jerarquia, { tipo: "Ingreso", excluirCategorias: excluir }),
        egresos: agruparPorCategoria(delMes, jerarquia, { tipo: "Egreso", excluirCategorias: excluir }),
      }];
    }),
  );

  return (
    <EstadisticasClient
      anioMes={anioMes}
      monedas={MONEDAS}
      totales={totales}
      porMoneda={porMoneda}
    />
  );
}
