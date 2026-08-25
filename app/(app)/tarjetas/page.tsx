import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TarjetasPageContent } from "@/components/tarjetas/tarjetas-page-content";
import {
  calcularConsumoTarjeta, getCicloDelProximoVencimiento, getPeriodoCierre, getProximoVencimiento,
} from "@/lib/domain/calcularConsumoTarjeta";

export default async function TarjetasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tarjetas }, { data: cuentas }, { data: movs }] = await Promise.all([
    supabase.from("tarjetas").select("*").eq("user_id", user.id).eq("archivada", false).order("created_at"),
    supabase.from("cuentas").select("*").eq("user_id", user.id).eq("archivada", false).order("orden"),
    // Sólo lo necesario para el consumo del ciclo de cada tarjeta.
    supabase.from("movimientos")
      .select("tipo, monto, moneda, fecha, tarjeta_id")
      .eq("user_id", user.id).eq("tipo", "Egreso").not("tarjeta_id", "is", null),
  ]);

  const movimientos = movs ?? [];

  // El listado no mostraba ningún dato de plata: se agrega el ciclo de cada
  // tarjeta (consumo por moneda, cierre y vencimiento) como lo haría un banco.
  const resumen = Object.fromEntries((tarjetas ?? []).map((t) => {
    let fin: string, vencimiento: string | null;
    if (t.cierre_dia != null && t.vencimiento_dia != null) {
      const ciclo = getCicloDelProximoVencimiento(t.cierre_dia, t.vencimiento_dia);
      fin = ciclo.fin; vencimiento = ciclo.fechaVencimiento;
    } else {
      const periodo = getPeriodoCierre(t.cierre_dia);
      fin = periodo.fin; vencimiento = getProximoVencimiento(t.vencimiento_dia);
    }
    const inicio = t.cierre_dia != null && t.vencimiento_dia != null
      ? getCicloDelProximoVencimiento(t.cierre_dia, t.vencimiento_dia).inicio
      : getPeriodoCierre(t.cierre_dia).inicio;

    return [t.id, {
      consumo: calcularConsumoTarjeta(t.id, movimientos, inicio, fin),
      cierre: fin,
      vencimiento,
    }];
  }));

  return (
    <TarjetasPageContent
      tarjetas={tarjetas ?? []}
      cuentas={cuentas ?? []}
      resumen={resumen}
    />
  );
}
