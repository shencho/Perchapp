import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularSaldoCuenta } from "@/lib/domain/calcularSaldoCuenta";
import { idsAjusteInversion } from "@/lib/domain/finanzas";
import { rangoMeses, resumenMensual } from "@/lib/domain/cashflow";
import { CashFlowClient } from "./_components/cash-flow-client";

const MONEDAS = ["ARS", "USD"];
const MESES_ATRAS = 12;
const MESES_ADELANTE = 12;

export default async function CashFlowPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const anio = now.getFullYear();
  const mes = now.getMonth();
  const mesActual = `${anio}-${String(mes + 1).padStart(2, "0")}`;

  const desde = new Date(anio, mes - MESES_ATRAS, 1).toISOString().slice(0, 10);
  const hasta = new Date(anio, mes + MESES_ADELANTE + 1, 0).toISOString().slice(0, 10);

  const [cuentasRes, ventanaRes, saldosRes, categoriasRes] = await Promise.all([
    supabase.from("cuentas")
      .select("id, tipo, moneda, saldo")
      .eq("user_id", user.id).eq("archivada", false),
    // Ventana amplia: histórico + compromisos futuros ya cargados (cuotas).
    supabase.from("movimientos")
      .select("tipo, monto, moneda, fecha, categoria_id, frecuencia, clasificacion, cuota_grupo_id, es_compartido, gc_mi_parte, es_reembolso")
      .eq("user_id", user.id)
      .gte("fecha", desde).lte("fecha", hasta),
    // El saldo de una cuenta depende de TODA su historia: acotarlo a la
    // ventana daba un saldo inicial equivocado.
    supabase.from("movimientos")
      .select("tipo, monto, monto_destino, cuenta_id, cuenta_destino_id")
      .eq("user_id", user.id),
    supabase.from("categorias")
      .select("id, nombre")
      .eq("user_id", user.id).eq("archivada", false),
  ]);

  const cuentas = cuentasRes.data ?? [];
  const ventana = ventanaRes.data ?? [];
  const movSaldo = saldosRes.data ?? [];
  const excluir = idsAjusteInversion(categoriasRes.data ?? []);

  const meses = rangoMeses(
    `${new Date(anio, mes - MESES_ATRAS, 1).getFullYear()}-${String(new Date(anio, mes - MESES_ATRAS, 1).getMonth() + 1).padStart(2, "0")}`,
    `${new Date(anio, mes + MESES_ADELANTE, 1).getFullYear()}-${String(new Date(anio, mes + MESES_ADELANTE, 1).getMonth() + 1).padStart(2, "0")}`,
  );

  // Saldo líquido inicial por moneda.
  const saldoInicial: Record<string, number> = {};
  for (const moneda of MONEDAS) {
    saldoInicial[moneda] = cuentas
      .filter(c => ["Banco", "Billetera virtual", "Efectivo"].includes(c.tipo) && c.moneda === moneda)
      .reduce((acc, c) => acc + calcularSaldoCuenta(c.id, c.saldo ?? 0, movSaldo), 0);
  }

  const porMoneda = Object.fromEntries(
    MONEDAS.map(moneda => [
      moneda,
      resumenMensual(ventana, { meses, moneda, mesActual, excluirCategorias: excluir }),
    ]),
  );

  return (
    <CashFlowClient
      mesActual={mesActual}
      monedas={MONEDAS}
      saldoInicial={saldoInicial}
      porMoneda={porMoneda}
    />
  );
}
