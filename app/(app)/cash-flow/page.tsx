import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calcularSaldoCuenta } from "@/lib/domain/calcularSaldoCuenta";
import { CashFlowClient } from "./_components/cash-flow-client";

export default async function CashFlowPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const anio = now.getFullYear();
  const mes = now.getMonth();

  const fechaDesde3m = new Date(anio, mes - 3, 1).toISOString().slice(0, 10);
  const finMesActual = new Date(anio, mes + 1, 0).toISOString().slice(0, 10);
  // Ventana de futuros: desde el mes que viene hasta +12 meses (cuotas, no corrientes).
  const futuroDesde = new Date(anio, mes + 1, 1).toISOString().slice(0, 10);
  const futuroHasta = new Date(anio, mes + 13, 0).toISOString().slice(0, 10);

  const [cuentasRes, movimientosRes, categoriasRes, futurosRes] = await Promise.all([
    supabase.from("cuentas")
      .select("id, tipo, moneda, saldo")
      .eq("user_id", user.id).eq("archivada", false),
    supabase.from("movimientos")
      .select("tipo, monto, moneda, fecha, cuenta_id, cuenta_destino_id, categoria_id")
      .eq("user_id", user.id)
      .gte("fecha", fechaDesde3m)
      .lte("fecha", finMesActual),
    supabase.from("categorias")
      .select("id, nombre")
      .eq("user_id", user.id).eq("archivada", false),
    supabase.from("movimientos")
      .select("tipo, monto, moneda, fecha, categoria_id")
      .eq("user_id", user.id)
      .eq("moneda", "ARS")
      .gte("fecha", futuroDesde)
      .lte("fecha", futuroHasta),
  ]);

  const cuentas     = cuentasRes.data ?? [];
  const movimientos = movimientosRes.data ?? [];
  const categorias  = categoriasRes.data ?? [];
  const futuros     = futurosRes.data ?? [];

  const ajusteInversionIds = categorias
    .filter(c => c.nombre === "Ajuste de inversión")
    .map(c => c.id);

  // Saldo actual de cuentas líquidas en ARS
  const movSaldo = movimientos.map(m => ({
    tipo: m.tipo, monto: m.monto,
    cuenta_id: m.cuenta_id, cuenta_destino_id: m.cuenta_destino_id,
  }));

  const cuentasLiquidasARS = cuentas
    .filter(c => ["Banco", "Billetera virtual", "Efectivo"].includes(c.tipo) && c.moneda === "ARS")
    .map(c => calcularSaldoCuenta(c.id, c.saldo ?? 0, movSaldo));

  const saldoInicial = cuentasLiquidasARS.reduce((acc, s) => acc + s, 0);

  // Promedios de los últimos 3 meses completos
  const meses3 = [0, 1, 2].map(i => {
    const d = new Date(anio, mes - 1 - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  let ingCorriente = 0, egCorriente = 0;

  for (const mesStr of meses3) {
    const movMes = movimientos.filter(m =>
      m.fecha.slice(0, 7) === mesStr &&
      m.moneda === "ARS" &&
      !ajusteInversionIds.includes(m.categoria_id ?? "__")
    );
    ingCorriente += movMes.filter(m => m.tipo === "Ingreso").reduce((acc, m) => acc + m.monto, 0);
    egCorriente  += movMes.filter(m => m.tipo === "Egreso").reduce((acc, m) => acc + m.monto, 0);
  }

  const promedios = {
    ingCorriente: ingCorriente / 3,
    egCorriente:  egCorriente / 3,
    ingNoCorriente: 0,
    egNoCorriente:  0,
  };

  // Movimientos reales YA cargados en meses futuros (cuotas, no corrientes),
  // agregados por mes YYYY-MM. Se suman a la proyección para reflejarlos.
  const futurosPorMes: Record<string, { ing: number; eg: number }> = {};
  for (const m of futuros) {
    if (ajusteInversionIds.includes(m.categoria_id ?? "__")) continue;
    const key = m.fecha.slice(0, 7);
    if (!futurosPorMes[key]) futurosPorMes[key] = { ing: 0, eg: 0 };
    if (m.tipo === "Ingreso") futurosPorMes[key].ing += m.monto;
    else if (m.tipo === "Egreso") futurosPorMes[key].eg += m.monto;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-muted-foreground hover:text-gold transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Proyección de cash flow</h1>
          <p className="text-sm text-muted-foreground">Cuentas líquidas en ARS · promedio 3 meses</p>
        </div>
      </div>

      <CashFlowClient
        saldoInicial={saldoInicial}
        promedios={promedios}
        futurosPorMes={futurosPorMes}
        moneda="ARS"
      />
    </div>
  );
}
