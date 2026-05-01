import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { calcularSaldoCuenta, type MovimientoParaSaldo } from "@/lib/domain/calcularSaldoCuenta";
import { calcularConsumoTarjeta, getPeriodoCierre, getProximoVencimiento } from "@/lib/domain/calcularConsumoTarjeta";
import type { Cuenta, Tarjeta } from "@/types/supabase";

function fmt(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function CuentasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [cuentasRes, tarjetasRes, movRes] = await Promise.all([
    supabase.from("cuentas").select("*").eq("user_id", user.id).eq("archivada", false).order("orden"),
    supabase.from("tarjetas").select("*").eq("user_id", user.id).eq("archivada", false).order("created_at"),
    supabase.from("movimientos")
      .select("tipo, monto, moneda, cuenta_id, cuenta_destino_id, tarjeta_id, fecha")
      .eq("user_id", user.id),
  ]);

  const cuentas: Cuenta[] = cuentasRes.data ?? [];
  const tarjetas: Tarjeta[] = tarjetasRes.data ?? [];
  const movimientos: MovimientoParaSaldo[] = (movRes.data ?? []).map(m => ({
    tipo: m.tipo,
    monto: m.monto,
    cuenta_id: m.cuenta_id,
    cuenta_destino_id: m.cuenta_destino_id,
  }));
  const movimientosFull = movRes.data ?? [];

  // Calcular saldo por cuenta
  const saldos = cuentas.map(c => ({
    cuenta: c,
    saldo: calcularSaldoCuenta(c.id, c.saldo ?? 0, movimientos),
  }));

  const totalARS = saldos.filter(s => s.cuenta.moneda === "ARS").reduce((acc, s) => acc + s.saldo, 0);
  const totalUSD = saldos.filter(s => s.cuenta.moneda === "USD").reduce((acc, s) => acc + s.saldo, 0);

  // Calcular consumo por tarjeta
  const consumos = tarjetas.map(t => {
    const periodo = getPeriodoCierre(t.cierre_dia);
    const consumo = calcularConsumoTarjeta(t.id, movimientosFull, periodo.inicio, periodo.fin);
    const proximoVto = getProximoVencimiento(t.vencimiento_dia);
    return { tarjeta: t, consumo, proximoVto, periodo };
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Patrimonio</h1>
        <p className="text-sm text-muted-foreground mt-1">Saldos calculados al vuelo desde tus movimientos.</p>
      </div>

      {/* Sección A: Cuentas */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Mis cuentas</h2>
        {cuentas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenés cuentas cargadas. Agregá una en <Link href="/ajustes" className="underline">Ajustes → Cuentas</Link>.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cuenta</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Moneda</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Saldo actual</th>
                  </tr>
                </thead>
                <tbody>
                  {saldos.map(({ cuenta, saldo }) => (
                    <tr key={cuenta.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/cuentas/${cuenta.id}`} className="font-medium hover:text-primary transition-colors">
                          {cuenta.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{cuenta.tipo}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{cuenta.moneda}</td>
                      <td className={cn(
                        "px-4 py-3 text-right font-semibold tabular-nums",
                        saldo >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {fmt(saldo, cuenta.moneda)}
                      </td>
                    </tr>
                  ))}
                  {/* Totales */}
                  <tr className="border-t border-border bg-surface/50">
                    <td colSpan={3} className="px-4 py-2.5 text-sm font-medium text-muted-foreground">Total</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="text-sm font-semibold tabular-nums">{fmt(totalARS, "ARS")}</div>
                      {totalUSD !== 0 && <div className="text-xs text-muted-foreground tabular-nums">{fmt(totalUSD, "USD")}</div>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col gap-2">
              {saldos.map(({ cuenta, saldo }) => (
                <Link key={cuenta.id} href={`/cuentas/${cuenta.id}`} className="block border border-border rounded-lg p-3 bg-card hover:bg-surface/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{cuenta.nombre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cuenta.tipo} · {cuenta.moneda}</p>
                    </div>
                    <span className={cn("font-semibold tabular-nums", saldo >= 0 ? "text-green-400" : "text-red-400")}>
                      {fmt(saldo, cuenta.moneda)}
                    </span>
                  </div>
                </Link>
              ))}
              <div className="border border-border rounded-lg p-3 bg-surface/30 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <div className="text-right">
                  <div className="font-semibold tabular-nums text-sm">{fmt(totalARS, "ARS")}</div>
                  {totalUSD !== 0 && <div className="text-xs text-muted-foreground">{fmt(totalUSD, "USD")}</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Sección B: Tarjetas */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Mis tarjetas</h2>
        {tarjetas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenés tarjetas cargadas. Agregá una en <Link href="/ajustes" className="underline">Ajustes → Tarjetas</Link>.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tarjeta</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Banco</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Consumo del período</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Próx. vto.</th>
                  </tr>
                </thead>
                <tbody>
                  {consumos.map(({ tarjeta, consumo, proximoVto, periodo }) => (
                    <tr key={tarjeta.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/cuentas/tarjetas/${tarjeta.id}`} className="font-medium hover:text-primary transition-colors">
                          {tarjeta.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{tarjeta.tipo ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{tarjeta.banco_emisor ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-400">
                        {consumo > 0 ? fmt(consumo) : <span className="text-muted-foreground font-normal">$0</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {proximoVto ? new Date(proximoVto + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col gap-2">
              {consumos.map(({ tarjeta, consumo, proximoVto }) => (
                <Link key={tarjeta.id} href={`/cuentas/tarjetas/${tarjeta.id}`} className="block border border-border rounded-lg p-3 bg-card hover:bg-surface/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{tarjeta.nombre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tarjeta.tipo ?? "—"} · {tarjeta.banco_emisor ?? "—"}
                        {proximoVto && ` · vto ${new Date(proximoVto + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}`}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums text-red-400 text-sm">
                      {consumo > 0 ? fmt(consumo) : <span className="text-muted-foreground font-normal">$0</span>}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
