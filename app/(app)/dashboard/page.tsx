import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPrestamos } from "@/lib/supabase/actions/prestamos";
import { getClientes } from "@/lib/supabase/actions/clientes";
import { calcularSaldoCuenta } from "@/lib/domain/calcularSaldoCuenta";
import { calcularConsumoTarjeta, getPeriodoCierre, getProximoVencimiento, getCicloDelProximoVencimiento } from "@/lib/domain/calcularConsumoTarjeta";
import { getPlantillas } from "@/lib/supabase/actions/plantillas";
import { getPlantillasParaAlerta } from "@/lib/domain/plantillas";
import { calcularSaldoPrestamo } from "@/lib/domain/calcularSaldoPrestamo";
import { DashboardClient } from "./_components/dashboard-client";
import type { DashboardData, Alerta, MovGrafico } from "./_components/dashboard-client";

function fmtARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Phase 1: perfil ────────────────────────────────────────────────────────
  const { data: perfilData } = await supabase
    .from("profiles")
    .select("nombre, asistente_nombre, modo")
    .eq("id", user.id)
    .single();

  const modo = perfilData?.modo ?? "personal";
  const esProf = modo === "profesional" || modo === "ambos";

  // ── Fechas de referencia ───────────────────────────────────────────────────
  const now = new Date();
  const anio = now.getFullYear();
  const mes = now.getMonth();

  const inicioMesActual  = new Date(anio, mes, 1).toISOString().slice(0, 10);
  const finMesActual     = new Date(anio, mes + 1, 0).toISOString().slice(0, 10);
  const inicioMesAnt     = new Date(anio, mes - 1, 1).toISOString().slice(0, 10);
  const finMesAnt        = new Date(anio, mes, 0).toISOString().slice(0, 10);
  const fechaDesde24m    = new Date(anio, mes - 23, 1).toISOString().slice(0, 10);

  // ── Phase 2: todas las queries principales en paralelo ─────────────────────
  const [
    cuentasRes, tarjetasRes, movimientosRes, categoriasRes,
    prestamosRaw, gastosRes, plantillas,
  ] = await Promise.all([
    supabase.from("cuentas")
      .select("*")
      .eq("user_id", user.id).eq("archivada", false).order("orden"),
    supabase.from("tarjetas")
      .select("*")
      .eq("user_id", user.id).eq("archivada", false),
    supabase.from("movimientos")
      .select("tipo, monto, moneda, fecha, cuenta_id, cuenta_destino_id, tarjeta_id, categoria_id, ambito, necesidad, plantilla_recurrente_id")
      .eq("user_id", user.id)
      .gte("fecha", fechaDesde24m),
    supabase.from("categorias")
      .select("id, nombre")
      .eq("user_id", user.id).eq("archivada", false),
    getPrestamos(),
    supabase.from("gastos_compartidos_participantes")
      .select("persona_nombre, monto")
      .eq("user_id", user.id).eq("estado", "pendiente"),
    getPlantillas(),
  ]);

  const cuentas     = cuentasRes.data ?? [];
  const tarjetas    = tarjetasRes.data ?? [];
  const movimientos = movimientosRes.data ?? [];
  const categorias  = categoriasRes.data ?? [];
  const compartidos = gastosRes.data ?? [];

  // ── Phase 3: datos profesionales (solo si aplica) ──────────────────────────
  let clientesRaw: Awaited<ReturnType<typeof getClientes>> = [];
  let registrosMes: { monto: number }[] = [];
  let pagosMes: { monto: number }[] = [];

  if (esProf) {
    const [cl, rm, pm] = await Promise.all([
      getClientes(false),
      supabase.from("registros_trabajo").select("monto")
        .eq("user_id", user.id).gte("fecha", inicioMesActual).lte("fecha", finMesActual),
      supabase.from("pagos_cliente").select("monto")
        .eq("user_id", user.id).gte("fecha", inicioMesActual).lte("fecha", finMesActual),
    ]);
    clientesRaw = cl;
    registrosMes = rm.data ?? [];
    pagosMes = pm.data ?? [];
  }

  // ── Saldos de cuentas ──────────────────────────────────────────────────────
  const movSaldo = movimientos.map(m => ({
    tipo: m.tipo, monto: m.monto,
    cuenta_id: m.cuenta_id, cuenta_destino_id: m.cuenta_destino_id,
  }));

  const cuentasConSaldo = cuentas.map(c => ({
    id: c.id, nombre: c.nombre, tipo: c.tipo, moneda: c.moneda,
    saldo: calcularSaldoCuenta(c.id, c.saldo ?? 0, movSaldo),
    inv_subtipo: c.inv_subtipo ?? null,
    inv_fecha_vencimiento: c.inv_fecha_vencimiento ?? null,
    inv_tasa_anual: c.inv_tasa_anual ?? null,
  }));

  const cuentasLiquidas = cuentasConSaldo.filter(c =>
    ["Banco", "Billetera virtual", "Efectivo"].includes(c.tipo)
  );
  const inversionesBase = cuentasConSaldo.filter(c => c.tipo === "Inversión");
  const inversiones = inversionesBase.map(i => ({
    ...i,
    diasRestantes: i.inv_subtipo === "plazo_fijo" && i.inv_fecha_vencimiento
      ? Math.ceil(
          (new Date(i.inv_fecha_vencimiento + "T12:00:00").getTime() - Date.now()) / 86400000
        )
      : null,
  }));

  const totalARS = cuentasConSaldo.filter(c => c.moneda === "ARS").reduce((acc, c) => acc + c.saldo, 0);
  const totalUSD = cuentasConSaldo.filter(c => c.moneda === "USD").reduce((acc, c) => acc + c.saldo, 0);

  // ── IDs de "Ajuste de inversión" (excluir de gráfico y KPIs) ──────────────
  const ajusteInversionIds = categorias
    .filter(c => c.nombre === "Ajuste de inversión")
    .map(c => c.id);

  // ── Hero KPIs ──────────────────────────────────────────────────────────────
  const movMesActual = movimientos.filter(m =>
    m.fecha >= inicioMesActual && m.fecha <= finMesActual &&
    !ajusteInversionIds.includes(m.categoria_id ?? "__")
  );
  const ingresosDelMes = movMesActual.filter(m => m.tipo === "Ingreso").reduce((acc, m) => acc + m.monto, 0);
  const egresosDelMes  = movMesActual.filter(m => m.tipo === "Egreso").reduce((acc, m) => acc + m.monto, 0);
  const balanceDelMes  = ingresosDelMes - egresosDelMes;

  const movMesAnt = movimientos.filter(m =>
    m.fecha >= inicioMesAnt && m.fecha <= finMesAnt &&
    !ajusteInversionIds.includes(m.categoria_id ?? "__")
  );
  const balanceMesAnterior =
    movMesAnt.filter(m => m.tipo === "Ingreso").reduce((acc, m) => acc + m.monto, 0) -
    movMesAnt.filter(m => m.tipo === "Egreso").reduce((acc, m) => acc + m.monto, 0);

  // ── Tarjetas con consumo ───────────────────────────────────────────────────
  const tarjetasResumen = tarjetas.map(t => {
    if (!t.cierre_dia || !t.vencimiento_dia) {
      const periodo = getPeriodoCierre(t.cierre_dia);
      return {
        id: t.id, nombre: t.nombre, tipo: t.tipo, banco_emisor: t.banco_emisor,
        consumo: calcularConsumoTarjeta(t.id, movimientos, periodo.inicio, periodo.fin),
        proximoVto: getProximoVencimiento(t.vencimiento_dia),
        cicloAbierto: false,
      };
    }
    const ciclo = getCicloDelProximoVencimiento(t.cierre_dia, t.vencimiento_dia);
    return {
      id: t.id, nombre: t.nombre, tipo: t.tipo, banco_emisor: t.banco_emisor,
      consumo: calcularConsumoTarjeta(t.id, movimientos, ciclo.inicio, ciclo.fin),
      proximoVto: ciclo.fechaVencimiento,
      cicloAbierto: ciclo.cicloAbierto,
    };
  });

  // ── Préstamos con saldo ────────────────────────────────────────────────────
  const prestamosResumen = prestamosRaw
    .filter(p => p.estado === "activo")
    .map(p => ({
      id: p.id,
      tipo: p.tipo as "otorgado" | "recibido" | "bancario",
      moneda: p.moneda,
      saldoPendiente: calcularSaldoPrestamo(p.monto_inicial, p.prestamos_pagos ?? []).saldoPendiente,
      cuotaMensual: p.cuota_mensual ?? null,
      nombreLabel: p.tipo === "bancario"
        ? (p.institucion_nombre ?? "Banco")
        : (p.personas?.nombre ?? "—"),
    }))
    .filter(p => p.saldoPendiente > 0);

  // ── Gastos compartidos ─────────────────────────────────────────────────────
  const totalCompartidoPendiente = compartidos.reduce((acc, g) => acc + g.monto, 0);
  const compartidosPorPersona = Object.entries(
    compartidos.reduce((acc, g) => ({
      ...acc, [g.persona_nombre]: (acc[g.persona_nombre] ?? 0) + g.monto,
    }), {} as Record<string, number>)
  )
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // ── Análisis del mes ───────────────────────────────────────────────────────
  const categoriaMap = Object.fromEntries(categorias.map(c => [c.id, c.nombre]));
  const movEgresoMes = movMesActual.filter(m => m.tipo === "Egreso");
  const totalEgMes = movEgresoMes.reduce((acc, m) => acc + m.monto, 0);

  const byCat = movEgresoMes.reduce((acc, m) => {
    const k = m.categoria_id ?? "__sin__";
    return { ...acc, [k]: (acc[k] ?? 0) + m.monto };
  }, {} as Record<string, number>);

  const topCategorias = Object.entries(byCat)
    .map(([id, monto]) => ({
      id, nombre: categoriaMap[id] ?? "Sin categoría", monto,
      porcentaje: totalEgMes > 0 ? Math.round((monto / totalEgMes) * 100) : 0,
    }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5);

  const porNecesidad = [1, 2, 3, 4, 5]
    .map(nivel => ({
      nivel,
      monto: movEgresoMes.filter(m => m.necesidad === nivel).reduce((acc, m) => acc + m.monto, 0),
    }))
    .filter(n => n.monto > 0);

  const totalPersonal     = movEgresoMes.filter(m => m.ambito === "Personal").reduce((acc, m) => acc + m.monto, 0);
  const totalProfesional  = movEgresoMes.filter(m => m.ambito === "Profesional").reduce((acc, m) => acc + m.monto, 0);

  // ── Profesional ────────────────────────────────────────────────────────────
  let profesional: DashboardData["profesional"] = null;
  if (esProf) {
    const facturadoMes = registrosMes.reduce((acc, r) => acc + r.monto, 0);
    const cobradoMes = pagosMes.reduce((acc, p) => acc + p.monto, 0);
    const saldoPendienteTotal = clientesRaw.reduce((acc, c) => acc + (c.saldo_pendiente ?? 0), 0);
    const topDeudores = clientesRaw
      .filter(c => c.saldo_pendiente > 0)
      .sort((a, b) => b.saldo_pendiente - a.saldo_pendiente)
      .slice(0, 3)
      .map(c => ({ id: c.id, nombre: c.nombre, saldo: c.saldo_pendiente }));
    profesional = { facturadoMes, cobradoMes, saldoPendienteTotal, topDeudores };
  }

  // ── Alertas ────────────────────────────────────────────────────────────────
  const alertas: Alerta[] = [];

  // Tarjetas con vto en los próximos 7 días
  tarjetasResumen.forEach(t => {
    if (!t.proximoVto) return;
    const dias = Math.ceil(
      (new Date(t.proximoVto + "T12:00:00").getTime() - Date.now()) / 86400000
    );
    if (dias >= 0 && dias <= 7) {
      alertas.push({
        id: `tarjeta-${t.id}`,
        tipo: "tarjeta_vence",
        urgencia: dias <= 3 ? "alta" : "media",
        titulo: `Tarjeta ${t.nombre} vence ${dias === 0 ? "hoy" : `en ${dias}d`}`,
        descripcion: `${fmtARS(t.consumo)} de consumo pendiente${t.cicloAbierto ? " (ciclo en curso)" : ""}`,
        href: `/cuentas/tarjetas/${t.id}`,
      });
    }
  });

  // Plazos fijos vencidos
  inversiones
    .filter(i => i.inv_subtipo === "plazo_fijo" && i.diasRestantes !== null && i.diasRestantes !== undefined && i.diasRestantes <= 0)
    .forEach(i => {
      alertas.push({
        id: `pf-${i.id}`,
        tipo: "plazo_fijo_vencido",
        urgencia: "media",
        titulo: `"${i.nombre}" ya venció`,
        descripcion: `Hace ${Math.abs(i.diasRestantes!)}d. Registrá el rescate.`,
        href: `/cuentas/${i.id}`,
      });
    });

  // Plantillas pendientes próximas o atrasadas
  const alertasPlantillas = getPlantillasParaAlerta(plantillas, movimientos, now);
  alertasPlantillas.forEach(p => {
    const dias = Math.abs(p.diasRestantes);
    alertas.push({
      id:          `plantilla-${p.plantilla.id}`,
      tipo:        p.atrasada ? "plantilla_atrasada" : "plantilla_pendiente",
      urgencia:    p.atrasada || p.diasRestantes <= 1 ? "alta" : "media",
      titulo:      p.atrasada
        ? `${p.plantilla.nombre} sin generar (hace ${dias}d)`
        : p.diasRestantes === 0
          ? `${p.plantilla.nombre} debita hoy`
          : `${p.plantilla.nombre} debita en ${dias}d`,
      descripcion: `~${fmtARS(p.plantilla.monto_estimado)} estimado`,
      href:        `/movimientos?generar=${p.plantilla.id}`,
    });
  });

  // Clientes en mora (solo modo profesional)
  if (profesional) {
    profesional.topDeudores.forEach(d => {
      alertas.push({
        id: `mora-${d.id}`,
        tipo: "mora_cliente",
        urgencia: "media",
        titulo: `${d.nombre} tiene deuda pendiente`,
        descripcion: `${fmtARS(d.saldo)} sin cobrar`,
        href: `/clientes/${d.id}`,
      });
    });
  }

  // ── Ensamblar DashboardData ────────────────────────────────────────────────
  const dashboardData: DashboardData = {
    perfil: {
      nombre: perfilData?.nombre ?? "",
      asistente_nombre: perfilData?.asistente_nombre ?? null,
      email: user.email ?? "",
      modo,
    },
    hero: {
      totalARS, totalUSD,
      ingresosDelMes, egresosDelMes,
      balanceDelMes, balanceMesAnterior,
    },
    cuentasLiquidas,
    inversiones,
    tarjetas: tarjetasResumen,
    movimientosGrafico: movimientos.map(m => ({
      tipo: m.tipo as MovGrafico["tipo"],
      monto: m.monto, moneda: m.moneda, fecha: m.fecha,
      cuenta_id: m.cuenta_id, cuenta_destino_id: m.cuenta_destino_id,
      categoria_id: m.categoria_id,
      ambito: m.ambito ?? "Personal",
      necesidad: m.necesidad ?? null,
    })),
    cuentasParaFiltro: cuentasLiquidas.map(c => ({ id: c.id, nombre: c.nombre })),
    ajusteInversionIds,
    prestamos: prestamosResumen,
    compartidos: { totalPendiente: totalCompartidoPendiente, porPersona: compartidosPorPersona },
    analisis: { topCategorias, porNecesidad, totalPersonal, totalProfesional },
    profesional,
    alertas,
  };

  return <DashboardClient data={dashboardData} />;
}
