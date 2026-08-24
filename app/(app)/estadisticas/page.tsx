import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { idsAjusteInversion } from "@/lib/domain/finanzas";
import { buildJerarquia, agruparPorCategoria, agruparPorDimension } from "@/lib/domain/categorias";
import { EstadisticasClient } from "./_components/estadisticas-client";

const MONEDAS = ["ARS", "USD"];
const NECESIDAD_LABEL: Record<number, string> = {
  1: "1 · Imprescindible",
  2: "2 · Necesario",
  3: "3 · Conveniente",
  4: "4 · Prescindible",
  5: "5 · Superfluo",
};

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

  const [{ data: movRaw }, { data: categoriasRaw }, { data: cuentasRaw }] = await Promise.all([
    supabase.from("movimientos")
      .select("tipo, monto, moneda, categoria_id, metodo, cuenta_id, necesidad, es_compartido, gc_mi_parte, es_reembolso")
      .eq("user_id", user.id)
      .neq("tipo", "Transferencia")
      .gte("fecha", inicio).lte("fecha", fin),
    supabase.from("categorias")
      .select("id, nombre, parent_id")
      .eq("user_id", user.id),
    supabase.from("cuentas")
      .select("id, nombre")
      .eq("user_id", user.id),
  ]);

  const movimientos = movRaw ?? [];
  const categorias = categoriasRaw ?? [];
  const cuentas = cuentasRaw ?? [];
  const excluir = idsAjusteInversion(categorias);
  const jerarquia = buildJerarquia(categorias);
  const nombreCuenta = new Map(cuentas.map((c) => [c.id, c.nombre]));

  // Mismo dinero, cuatro agrupaciones: el total debe coincidir entre cortes.
  const porMoneda = Object.fromEntries(
    MONEDAS.map((moneda) => {
      const delMes = movimientos.filter((mv) => mv.moneda === moneda);
      const cortes = (tipo: "Ingreso" | "Egreso") => ({
        categoria: agruparPorCategoria(delMes, jerarquia, { tipo, excluirCategorias: excluir }),
        metodo: agruparPorDimension(delMes, {
          tipo, excluirCategorias: excluir,
          clave: (mv) => mv.metodo,
          nombre: (id) => id,
          etiquetaVacia: "Sin medio de pago",
        }),
        cuenta: agruparPorDimension(delMes, {
          tipo, excluirCategorias: excluir,
          clave: (mv) => mv.cuenta_id,
          nombre: (id) => nombreCuenta.get(id) ?? "Cuenta",
          etiquetaVacia: "Sin cuenta",
        }),
        necesidad: agruparPorDimension(delMes, {
          tipo, excluirCategorias: excluir,
          clave: (mv) => (mv.necesidad != null ? String(mv.necesidad) : null),
          nombre: (id) => NECESIDAD_LABEL[Number(id)] ?? id,
          etiquetaVacia: "Sin necesidad",
        }),
      });
      return [moneda, { ingresos: cortes("Ingreso"), egresos: cortes("Egreso") }];
    }),
  );

  return (
    <EstadisticasClient
      anioMes={anioMes}
      monedas={MONEDAS}
      porMoneda={porMoneda}
    />
  );
}
