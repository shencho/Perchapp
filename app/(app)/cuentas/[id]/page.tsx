import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { calcularSaldoCuenta, calcularIngresosDelMes, calcularEgresosDelMes, type MovimientoParaSaldo } from "@/lib/domain/calcularSaldoCuenta";

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
  searchParams: Promise<{ mes?: string }>;
}

export default async function CuentaDetallePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { mes } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cuenta } = await supabase
    .from("cuentas")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!cuenta) notFound();

  // Mes activo
  const now = new Date();
  const mesActual = mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [año, mesN] = mesActual.split("-");
  const inicio = `${año}-${mesN}-01`;
  const fin = new Date(Number(año), Number(mesN), 0).toISOString().slice(0, 10);

  // Movimientos del mes para esta cuenta (para KPIs y lista)
  const { data: movMes } = await supabase
    .from("movimientos")
    .select("id, tipo, monto, moneda, concepto, descripcion, categoria_id, fecha, cuenta_id, cuenta_destino_id, metodo, necesidad, es_compartido, gc_mi_parte")
    .eq("user_id", user.id)
    .gte("fecha", inicio)
    .lte("fecha", fin)
    .or(`cuenta_id.eq.${id},cuenta_destino_id.eq.${id}`)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  // Todos los movimientos para saldo histórico
  const { data: movAll } = await supabase
    .from("movimientos")
    .select("tipo, monto, cuenta_id, cuenta_destino_id")
    .eq("user_id", user.id);

  const movSaldo: MovimientoParaSaldo[] = (movAll ?? []).map(m => ({
    tipo: m.tipo,
    monto: m.monto,
    cuenta_id: m.cuenta_id,
    cuenta_destino_id: m.cuenta_destino_id,
  }));

  const movMesSaldo: MovimientoParaSaldo[] = (movMes ?? []).map(m => ({
    tipo: m.tipo,
    monto: m.monto,
    cuenta_id: m.cuenta_id,
    cuenta_destino_id: m.cuenta_destino_id,
  }));

  const saldoActual = calcularSaldoCuenta(id, cuenta.saldo ?? 0, movSaldo);
  const ingresosDelMes = calcularIngresosDelMes(id, movMesSaldo);
  const egresosDelMes = calcularEgresosDelMes(id, movMesSaldo);
  const balanceDelMes = ingresosDelMes - egresosDelMes;

  // Navegación entre meses
  const [añoN, mesNN] = [Number(año), Number(mesN)];
  const mesPrev = new Date(añoN, mesNN - 2, 1);
  const mesSig = new Date(añoN, mesNN, 1);
  const mesNow = new Date(now.getFullYear(), now.getMonth(), 1);
  const mesPrevStr = `${mesPrev.getFullYear()}-${String(mesPrev.getMonth() + 1).padStart(2, "0")}`;
  const mesSigStr = `${mesSig.getFullYear()}-${String(mesSig.getMonth() + 1).padStart(2, "0")}`;
  const esMesActual = mesSig.getTime() > mesNow.getTime();

  const labelMes = new Date(añoN, mesNN - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const NECESIDAD_COLORS: Record<number, string> = {
    1: "bg-red-900/50 text-red-300 border-red-800",
    2: "bg-orange-900/50 text-orange-300 border-orange-800",
    3: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
    4: "bg-green-900/50 text-green-300 border-green-800",
    5: "bg-emerald-900/50 text-emerald-300 border-emerald-800",
  };

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
          <h1 className="text-2xl font-semibold">{cuenta.nombre}</h1>
          <span className="text-xs px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">{cuenta.tipo}</span>
          <span className="text-xs text-muted-foreground">{cuenta.moneda}</span>
        </div>
        <div className="mt-2">
          <span className="text-3xl font-bold tabular-nums">{fmt(saldoActual, cuenta.moneda)}</span>
          <span className="text-sm text-muted-foreground ml-2">saldo actual</span>
        </div>
      </div>

      {/* Navegador de mes */}
      <div className="flex items-center gap-2">
        <Link href={`/cuentas/${id}?mes=${mesPrevStr}`} className="p-1.5 rounded-md hover:bg-surface transition-colors border border-border">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-medium capitalize min-w-[140px] text-center">{labelMes}</span>
        <Link
          href={`/cuentas/${id}?mes=${mesSigStr}`}
          className={cn("p-1.5 rounded-md border border-border transition-colors", esMesActual ? "opacity-30 pointer-events-none" : "hover:bg-surface")}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ingresos", value: ingresosDelMes, color: "text-green-400" },
          { label: "Egresos", value: egresosDelMes, color: "text-red-400" },
          { label: "Balance", value: balanceDelMes, color: balanceDelMes >= 0 ? "text-green-400" : "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-border rounded-lg p-3 bg-card">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-base font-semibold tabular-nums mt-0.5", color)}>
              {balanceDelMes >= 0 && label === "Balance" ? "+" : ""}{fmt(value, cuenta.moneda)}
            </p>
          </div>
        ))}
      </div>

      {/* Movimientos */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Movimientos del mes</h2>
        {!movMes || movMes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No hay movimientos este mes en esta cuenta.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concepto</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Método</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monto</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">N</th>
                  </tr>
                </thead>
                <tbody>
                  {movMes.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtFecha(m.fecha)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium truncate block max-w-[240px]">
                          {m.concepto || m.descripcion || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{m.metodo ?? "—"}</td>
                      <td className={cn(
                        "px-4 py-3 text-right font-semibold tabular-nums",
                        m.tipo === "Ingreso" ? "text-green-400" : m.tipo === "Egreso" ? "text-red-400" : "text-muted-foreground"
                      )}>
                        {m.tipo === "Ingreso" ? "+" : m.tipo === "Egreso" ? "-" : "↔"}{fmt(m.monto, m.moneda)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.necesidad ? (
                          <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold", NECESIDAD_COLORS[m.necesidad])}>
                            {m.necesidad}
                          </span>
                        ) : <span className="text-muted-foreground/30">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col gap-2">
              {movMes.map((m) => (
                <div key={m.id} className="border border-border rounded-lg p-3 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.concepto || m.descripcion || "—"}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{fmtFecha(m.fecha)}</span>
                        {m.metodo && <><span>·</span><span>{m.metodo}</span></>}
                      </div>
                    </div>
                    <span className={cn(
                      "font-semibold tabular-nums text-sm shrink-0",
                      m.tipo === "Ingreso" ? "text-green-400" : m.tipo === "Egreso" ? "text-red-400" : "text-muted-foreground"
                    )}>
                      {m.tipo === "Ingreso" ? "+" : m.tipo === "Egreso" ? "-" : "↔"}{fmt(m.monto, m.moneda)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Para editar movimientos, usá la sección <Link href="/movimientos" className="underline hover:text-foreground">Movimientos</Link>.
        Para configurar la cuenta, usá <Link href="/ajustes" className="underline hover:text-foreground">Ajustes → Cuentas</Link>.
      </p>
    </div>
  );
}
