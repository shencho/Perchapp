import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { calcularConsumoTarjeta, getPeriodoCierre, getProximoVencimiento, getCicloDelProximoVencimiento } from "@/lib/domain/calcularConsumoTarjeta";

function fmt(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtFecha(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TarjetaDetallePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tarjeta } = await supabase
    .from("tarjetas")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!tarjeta) notFound();

  let inicio: string, fin: string, proximoVto: string | null;
  if (tarjeta.cierre_dia != null && tarjeta.vencimiento_dia != null) {
    const ciclo = getCicloDelProximoVencimiento(tarjeta.cierre_dia, tarjeta.vencimiento_dia);
    inicio = ciclo.inicio;
    fin = ciclo.fin;
    proximoVto = ciclo.fechaVencimiento;
  } else {
    const periodo = getPeriodoCierre(tarjeta.cierre_dia);
    inicio = periodo.inicio;
    fin = periodo.fin;
    proximoVto = getProximoVencimiento(tarjeta.vencimiento_dia);
  }

  // Movimientos del período actual con esta tarjeta
  const { data: movPeriodo } = await supabase
    .from("movimientos")
    .select("id, tipo, monto, moneda, concepto, descripcion, fecha, metodo, clasificacion, cuotas, fecha_vencimiento")
    .eq("user_id", user.id)
    .eq("tarjeta_id", id)
    .gte("fecha", inicio)
    .lte("fecha", fin)
    .order("fecha", { ascending: false });

  // Cuotas pendientes (fuera del período actual, clasificacion=Cuotas)
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: cuotasPendientes } = await supabase
    .from("movimientos")
    .select("id, monto, moneda, concepto, fecha, cuotas, fecha_vencimiento")
    .eq("user_id", user.id)
    .eq("tarjeta_id", id)
    .eq("clasificacion", "Cuotas")
    .gt("fecha_vencimiento", hoy)
    .order("fecha_vencimiento", { ascending: true })
    .limit(20);

  const consumoTotal = calcularConsumoTarjeta(id, (movPeriodo ?? []).map(m => ({
    monto: m.monto, tarjeta_id: id, fecha: m.fecha,
  })), inicio, fin);

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <Link href="/cuentas" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft className="h-4 w-4" />
        Patrimonio
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold">{tarjeta.nombre}</h1>
          {tarjeta.tipo && <span className="text-xs px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">{tarjeta.tipo}</span>}
          {tarjeta.banco_emisor && <span className="text-xs text-muted-foreground">{tarjeta.banco_emisor}</span>}
          {tarjeta.ultimos_cuatro && <span className="text-xs text-muted-foreground">···· {tarjeta.ultimos_cuatro}</span>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-xs text-muted-foreground">Consumo del período</p>
          <p className="text-xl font-bold tabular-nums text-red-400 mt-0.5">{fmt(consumoTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">{fmtFecha(inicio)} — {fmtFecha(fin)}</p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-xs text-muted-foreground">Próximo vencimiento</p>
          <p className="text-xl font-bold mt-0.5">
            {proximoVto ? new Date(proximoVto + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "long" }) : "—"}
          </p>
          {tarjeta.limite && (
            <p className="text-xs text-muted-foreground mt-1">
              Límite: {fmt(tarjeta.limite_ars ?? tarjeta.limite)}
            </p>
          )}
        </div>
      </div>

      {/* Consumos del período */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Consumos del período actual</h2>
        {!movPeriodo || movPeriodo.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin consumos en este período.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concepto</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Clasif.</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movPeriodo.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtFecha(m.fecha)}</td>
                    <td className="px-4 py-3 font-medium truncate max-w-[200px]">{m.concepto || m.descripcion || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {m.clasificacion === "Cuotas" ? `${m.cuotas} cuotas` : (m.clasificacion ?? "—")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-400">
                      {fmt(m.monto, m.moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cuotas pendientes */}
      {cuotasPendientes && cuotasPendientes.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Cuotas pendientes</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concepto</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cuotas</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto/cuota</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Vto.</th>
                </tr>
              </thead>
              <tbody>
                {cuotasPendientes.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium truncate max-w-[200px]">{m.concepto || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{m.cuotas ?? "—"} cuotas</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(m.monto / (m.cuotas ?? 1), m.moneda)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {m.fecha_vencimiento ? fmtFecha(m.fecha_vencimiento) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Para configurar la tarjeta, usá <Link href="/ajustes" className="underline hover:text-foreground">Ajustes → Tarjetas</Link>.
      </p>
    </div>
  );
}
