import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CreditCard, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPeriodoCierre, getProximoVencimiento, getCicloDelProximoVencimiento } from "@/lib/domain/calcularConsumoTarjeta";
import { GraficoTarjeta } from "./_components/grafico-tarjeta";
import { categoriaNombreToLucide } from "@/lib/ui/category-icons";
import { PagarResumen } from "./_components/pagar-resumen";
import { MangoBlob } from "@/components/ui/mango-logo";
import { getResumenTarjeta } from "@/lib/supabase/actions/pagos-tarjeta";
import { getPlantillasPendientesDelMes } from "@/lib/domain/plantillas";
import type { PlantillaRecurrente } from "@/types/supabase";

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

/** Distingue de un vistazo débito automático, cuotas y gasto puntual. */
function BadgeTipoGasto({
  metodo, clasificacion, cuotaNumero, cuotas,
}: {
  metodo: string | null;
  clasificacion: string | null;
  cuotaNumero: number | null;
  cuotas: number | null;
}) {
  if (metodo === "Débito automático") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20 text-[10px] font-medium whitespace-nowrap">
        <Repeat className="h-3 w-3" /> Débito automático
      </span>
    );
  }
  if (clasificacion === "Cuotas") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-info/10 text-info border border-info/20 text-[10px] font-medium whitespace-nowrap">
        <CreditCard className="h-3 w-3" />
        {cuotaNumero ? `Cuota ${cuotaNumero}/${cuotas}` : `${cuotas} cuotas`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border text-[10px] font-medium whitespace-nowrap">
      Puntual
    </span>
  );
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
    .select("id, tipo, monto, moneda, concepto, descripcion, fecha, metodo, clasificacion, cuotas, cuota_numero, fecha_compra, fecha_vencimiento, categorias ( id, nombre, parent_id )")
    .eq("user_id", user.id)
    .eq("tarjeta_id", id)
    .gte("fecha", inicio)
    .lte("fecha", fin)
    .order("fecha", { ascending: false });

  // Cuotas pendientes (fuera del período actual, clasificacion=Cuotas)
  const ahora = new Date();
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
  const mesActual = hoy.slice(0, 7);
  const { data: cuotasPendientes } = await supabase
    .from("movimientos")
    .select("id, monto, moneda, concepto, fecha, cuotas, cuota_numero, fecha_vencimiento")
    .eq("user_id", user.id)
    .eq("tarjeta_id", id)
    .eq("clasificacion", "Cuotas")
    .gt("fecha_vencimiento", hoy)
    .order("fecha_vencimiento", { ascending: true })
    .limit(20);

  // Ventana amplia (±24 meses) para los gráficos de tendencia y acumulado.
  const desde = `${ahora.getFullYear() - 2}-${String(ahora.getMonth() + 1).padStart(2, "0")}-01`;
  const hasta = `${ahora.getFullYear() + 2}-${String(ahora.getMonth() + 1).padStart(2, "0")}-28`;
  const { data: movVentana } = await supabase
    .from("movimientos")
    .select("fecha, monto, moneda")
    .eq("user_id", user.id)
    .eq("tarjeta_id", id)
    .eq("tipo", "Egreso")
    .gte("fecha", desde)
    .lte("fecha", hasta);

  // Cuentas + resumen del ciclo + los débitos automáticos de ESTA tarjeta.
  //
  // Las plantillas recurrentes ya tenían `tarjeta_id`, pero no se mostraban en
  // ningún lado por tarjeta: no se podía ver qué se le debita a cada una ni
  // cuáles faltaban aplicar este mes.
  const inicioMes = `${mesActual}-01`;
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [{ data: cuentas }, resumen, { data: plantillasTarjeta }, { data: generadosMes }] =
    await Promise.all([
      supabase.from("cuentas").select("id, nombre, moneda")
        .eq("user_id", user.id).eq("archivada", false).order("orden"),
      getResumenTarjeta(id),
      supabase.from("plantillas_recurrentes").select("*")
        .eq("user_id", user.id).eq("tarjeta_id", id).eq("activo", true)
        .order("dia_mes"),
      supabase.from("movimientos").select("plantilla_recurrente_id, fecha")
        .eq("user_id", user.id).not("plantilla_recurrente_id", "is", null)
        .gte("fecha", inicioMes).lte("fecha", finMes),
    ]);

  // Mismo helper que usan el inicio (alertas) y Movimientos (pendientes), así
  // las tres superficies no pueden discrepar sobre qué está pendiente.
  const debitos = (plantillasTarjeta ?? []) as PlantillaRecurrente[];
  const pendientesDeEsta = getPlantillasPendientesDelMes(debitos, generadosMes ?? [], ahora);
  const idsPendientes = new Set(pendientesDeEsta.map(p => p.plantilla.id));

  // Días que faltan para el cierre y el vencimiento (como los muestra un banco).
  const hoyDate = new Date(); hoyDate.setHours(0, 0, 0, 0);
  const diasHasta = (iso: string | null) =>
    iso ? Math.round((new Date(iso + "T12:00:00").getTime() - hoyDate.getTime()) / 86400000) : null;
  const diasParaCierre = diasHasta(fin);
  const diasParaVto = diasHasta(proximoVto);
  const textoDias = (d: number | null) =>
    d === null ? "" : d === 0 ? "es hoy" : d > 0 ? `en ${d} ${d === 1 ? "día" : "días"}` : "pasó";

  // El límite estaba gateado en la columna vieja `limite`, que el formulario
  // ya no escribe: por eso no se mostraba nunca aunque estuviera cargado.
  const limites: [string, number][] = [];
  if (tarjeta.limite_ars) limites.push(["ARS", tarjeta.limite_ars]);
  if (tarjeta.limite_usd) limites.push(["USD", tarjeta.limite_usd]);
  if (limites.length === 0 && tarjeta.limite) limites.push(["ARS", tarjeta.limite]);

  // El número grande es lo que FALTA pagar, no el consumo bruto. Salía de
  // `calcularConsumoTarjeta`, que sólo suma Egresos: registrabas el pago del
  // resumen y el total seguía igual. `resumen` ya trae el desglose con los
  // pagos descontados, así que se usa esa única fuente.
  const saldoPorMoneda = resumen?.porMoneda ?? {};
  const totalCiclo = Object.entries(saldoPorMoneda)
    .map(([moneda, s]) => [moneda, s.aPagar] as const)
    .filter(([, v]) => v > 0);
  const huboConsumo = Object.values(saldoPorMoneda).some(s => s.total > 0);
  const cicloPagado = huboConsumo && totalCiclo.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <Link href="/tarjetas" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-gold transition-colors w-fit">
        <ChevronLeft className="h-4 w-4" />
        Tarjetas
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

      {/* Pago del resumen (sólo tarjetas de crédito) */}
      {tarjeta.tipo !== "Débito" && resumen && (cuentas ?? []).length > 0 && (
        <div className="flex justify-end">
          <PagarResumen
            tarjetaId={id}
            tarjetaNombre={tarjeta.nombre}
            cuentas={cuentas ?? []}
            cuentaPagoDefault={tarjeta.cuenta_pago_default ?? null}
            resumen={resumen}
          />
        </div>
      )}

      {/* Resumen del ciclo, con el formato de un resumen bancario */}
      <div className="mango-card-navy p-[26px] text-white">
        <MangoBlob size={220} style={{ right: -60, top: -80 }} />
        <div className="relative">
          <p className="text-[13px] font-medium text-cream">
            {cicloPagado ? "Resumen del ciclo" : "Total del ciclo a pagar"}
          </p>
          {totalCiclo.length === 0 ? (
            cicloPagado ? (
              <p className="mt-1 font-semibold text-white" style={{ fontSize: 34, lineHeight: 1.1 }}>
                Pagado
              </p>
            ) : (
              <p className="mt-1 font-mono font-semibold text-white" style={{ fontSize: 40, lineHeight: 1.05 }}>$0</p>
            )
          ) : (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1">
              {totalCiclo.map(([moneda, v]) => (
                <p key={moneda} className="font-mono font-semibold text-white" style={{ fontSize: 40, lineHeight: 1.05 }}>
                  {fmt(v, moneda)}
                </p>
              ))}
            </div>
          )}

          {(() => {
            const dev = Object.entries(saldoPorMoneda).filter(([, v]) => v.devoluciones > 0);
            if (dev.length === 0) return null;
            return (
              <p className="mt-2 text-[13px] text-cream/80">
                Incluye devoluciones por{" "}
                {dev.map(([moneda, v]) => fmt(v.devoluciones, moneda)).join(" · ")}
              </p>
            );
          })()}

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
            <div>
              <p className="text-[11px] text-cream/70">Cierre</p>
              <p className="text-sm font-semibold mt-0.5">{fmtFecha(fin)}</p>
              <p className="text-[11px] text-cream/60 mt-0.5">{textoDias(diasParaCierre)}</p>
            </div>
            <div>
              <p className="text-[11px] text-cream/70">Vencimiento</p>
              <p className="text-sm font-semibold mt-0.5">
                {proximoVto ? fmtFecha(proximoVto) : "—"}
              </p>
              <p className="text-[11px] text-cream/60 mt-0.5">{textoDias(diasParaVto)}</p>
            </div>
            <div>
              <p className="text-[11px] text-cream/70">Límite</p>
              {limites.length === 0 ? (
                <p className="text-sm font-semibold mt-0.5">—</p>
              ) : (
                limites.map(([moneda, v]) => (
                  <p key={moneda} className="text-sm font-semibold mt-0.5 font-mono">{fmt(v, moneda)}</p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tendencia mes a mes + acumulado comprometido */}
      <GraficoTarjeta movimientos={movVentana ?? []} mesActual={mesActual} />

      {/* Consumos del período */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Movimientos del período actual</h2>
        {!movPeriodo || movPeriodo.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin movimientos en este período.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concepto</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movPeriodo.map((m) => {
                  // El embed puede venir como objeto o como array según la inferencia.
                  const rel = (m as unknown as { categorias?: { nombre: string } | { nombre: string }[] | null }).categorias;
                  const cat = Array.isArray(rel) ? rel[0] : rel;
                  const Icono = categoriaNombreToLucide(cat?.nombre);
                  // La tabla pintaba TODAS las filas en rojo y sin signo, así
                  // que una devolución de percepciones (Ingreso) y hasta el
                  // pago del resumen (Transferencia) se leían como un consumo
                  // más. Son créditos a favor: van en verde y con signo.
                  const esCredito = m.tipo === "Ingreso";
                  const esPago = m.tipo === "Transferencia";
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtFecha(m.fecha)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="grid place-items-center rounded-[9px] shrink-0"
                            style={{ width: 30, height: 30, background: "#f3ecdc" }}
                          >
                            <Icono className="h-4 w-4" style={{ color: "#1e3a5f" }} />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium truncate max-w-[220px]">
                              {m.concepto || m.descripcion || "—"}
                            </span>
                            <span className="block text-xs text-muted-foreground truncate">
                              {cat?.nombre ?? "Sin categoría"}
                              {m.fecha_compra ? ` · compra ${fmtFecha(m.fecha_compra)}` : ""}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {esCredito ? (
                          <span className="text-xs px-2 py-0.5 rounded-[var(--radius-chip)] border bg-success/10 text-success border-success/20 whitespace-nowrap">
                            Devolución
                          </span>
                        ) : esPago ? (
                          <span className="text-xs px-2 py-0.5 rounded-[var(--radius-chip)] border bg-info/10 text-info border-info/20 whitespace-nowrap">
                            Pago del resumen
                          </span>
                        ) : (
                          <BadgeTipoGasto
                            metodo={m.metodo}
                            clasificacion={m.clasificacion}
                            cuotaNumero={m.cuota_numero}
                            cuotas={m.cuotas}
                          />
                        )}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right font-semibold tabular-nums font-mono whitespace-nowrap",
                        esCredito || esPago ? "text-success" : "text-danger",
                      )}>
                        {esCredito || esPago ? "− " : ""}{fmt(m.monto, m.moneda)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Débitos automáticos y suscripciones de esta tarjeta */}
      {debitos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Débitos automáticos y suscripciones
            </h2>
            {pendientesDeEsta.length > 0 && (
              <Link
                href="/movimientos?generar=1"
                className="text-xs font-medium text-gold hover:underline"
              >
                Aplicar {pendientesDeEsta.length} pendiente{pendientesDeEsta.length === 1 ? "" : "s"}
              </Link>
            )}
          </div>
          <div className="rounded-[var(--radius-card)] border border-border divide-y divide-border">
            {debitos.map((d) => {
              const pendiente = idsPendientes.has(d.id);
              return (
                <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      Día {d.dia_mes} de cada mes
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm tabular-nums font-mono">
                      {fmt(d.monto_estimado, d.moneda)}
                    </span>
                    <span className={cn(
                      "text-[11px] px-2 py-0.5 rounded-[var(--radius-chip)] border whitespace-nowrap",
                      pendiente
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-success/10 text-success border-success/20",
                    )}>
                      {pendiente ? "Pendiente" : "Aplicado"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cuotas pendientes */}
      {cuotasPendientes && cuotasPendientes.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Cuotas pendientes</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concepto</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cuota</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Vto.</th>
                </tr>
              </thead>
              <tbody>
                {cuotasPendientes.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium truncate max-w-[200px]">{m.concepto || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {m.cuota_numero ? `${m.cuota_numero}/${m.cuotas}` : `${m.cuotas ?? "—"} cuotas`}
                    </td>
                    {/* Cada fila YA es una cuota: el monto es el de esa cuota. */}
                    <td className="px-4 py-3 text-right tabular-nums font-mono">{fmt(m.monto, m.moneda)}</td>
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
        Para configurar la tarjeta, usá <Link href="/cuentas" className="underline hover:text-foreground">Cuentas</Link>.
      </p>
    </div>
  );
}
