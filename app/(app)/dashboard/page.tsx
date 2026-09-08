import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPrestamos } from "@/lib/supabase/actions/prestamos";
import { getCuotasPendientesDelMes } from "@/lib/domain/prestamos-auto";
import { calcularSaldoCuenta } from "@/lib/domain/calcularSaldoCuenta";
import { montoPropio } from "@/lib/domain/_utils/movimiento";
import { totalesPorMoneda, idsAjusteInversion } from "@/lib/domain/finanzas";
import { buildJerarquia, agruparPorCategoria } from "@/lib/domain/categorias";
import { calcularSaldoTarjeta, getPeriodoCierre, getProximoVencimiento, getCicloDelProximoVencimiento } from "@/lib/domain/calcularConsumoTarjeta";
import { getPlantillas } from "@/lib/supabase/actions/plantillas";
import { getPlantillasParaAlerta } from "@/lib/domain/plantillas";
import { getAlertasSilenciadasVigentes } from "@/lib/supabase/actions/alertas";
import { getPresupuestos } from "@/lib/supabase/actions/presupuestos";
import { calcularSaldoPrestamo } from "@/lib/domain/calcularSaldoPrestamo";
import { DashboardClient } from "./_components/dashboard-client";
import type { DashboardData, Alerta, MovGrafico } from "./_components/dashboard-client";

/** Formatea un consumo por moneda sin sumarlas entre sí (p. ej. "$12.000 · US$ 80"). */
function fmtMonedas(porMoneda: Record<string, number>) {
  const partes = Object.entries(porMoneda)
    .filter(([, v]) => v > 0)
    .map(([moneda, v]) =>
      new Intl.NumberFormat("es-AR", {
        style: "currency", currency: moneda,
        minimumFractionDigits: 0, maximumFractionDigits: 0,
      }).format(v),
    );
  return partes.length > 0 ? partes.join(" · ") : "$0";
}

function fmtARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

/** Monedas para las que se calcula el análisis del mes. */
const MONEDAS_ANALISIS = ["ARS", "USD"] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Phase 1: perfil ────────────────────────────────────────────────────────
  const { data: perfilData } = await supabase
    .from("profiles")
    .select("nombre, asistente_nombre")
    .eq("id", user.id)
    .single();

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
  const mesActualStr = `${anio}-${String(mes + 1).padStart(2, "0")}`;
  const [
    cuentasRes, tarjetasRes, movimientosRes, categoriasRes,
    prestamosRaw, gastosRes, plantillas, silenciadasRaw, presupuestosMes,
  ] = await Promise.all([
    supabase.from("cuentas")
      .select("*")
      .eq("user_id", user.id).eq("archivada", false).order("orden"),
    supabase.from("tarjetas")
      .select("*")
      .eq("user_id", user.id).eq("archivada", false),
    supabase.from("movimientos")
      .select("tipo, monto, monto_destino, moneda, fecha, cuenta_id, cuenta_destino_id, tarjeta_id, categoria_id, necesidad, plantilla_recurrente_id, es_compartido, gc_mi_parte, es_reembolso")
      .eq("user_id", user.id)
      .gte("fecha", fechaDesde24m),
    // Sin filtrar por archivada: este catálogo se usa para RESOLVER nombres y
    // jerarquía de movimientos ya guardados, no para ofrecer opciones. Con el
    // filtro puesto, archivar una subcategoría hacía que sus gastos cayeran al
    // fallback y aparecieran como una fila "Sin categoría".
    supabase.from("categorias")
      .select("id, nombre, parent_id")
      .eq("user_id", user.id),
    getPrestamos(),
    supabase.from("gastos_compartidos_participantes")
      .select("persona_nombre, monto")
      .eq("user_id", user.id).eq("estado", "pendiente")
      .not("persona_id", "is", null), // excluye la parte propia "Vos" (no es deuda cobrable)
    getPlantillas(),
    getAlertasSilenciadasVigentes(),
    getPresupuestos(mesActualStr).catch(() => []),
  ]);

  const cuentas     = cuentasRes.data ?? [];
  const tarjetas    = tarjetasRes.data ?? [];
  const movimientos = movimientosRes.data ?? [];
  const categorias  = categoriasRes.data ?? [];
  const compartidos = gastosRes.data ?? [];

  // ── Saldos de cuentas ──────────────────────────────────────────────────────
  const movSaldo = movimientos.map(m => ({
    tipo: m.tipo, monto: m.monto, monto_destino: m.monto_destino,
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
  const ajusteInversionIds = idsAjusteInversion(categorias);

  // ── Hero KPIs ──────────────────────────────────────────────────────────────
  // Criterio ÚNICO y por moneda (lib/domain/finanzas.ts): mismo número que
  // estadísticas, cash-flow y presupuestos.
  const enMesActual = movimientos.filter(m => m.fecha >= inicioMesActual && m.fecha <= finMesActual);
  const enMesAnt    = movimientos.filter(m => m.fecha >= inicioMesAnt && m.fecha <= finMesAnt);

  const totMes    = totalesPorMoneda(enMesActual, { excluirCategorias: ajusteInversionIds });
  const totMesAnt = totalesPorMoneda(enMesAnt,    { excluirCategorias: ajusteInversionIds });

  const ingresosDelMes = totMes.ARS.ingresos;
  const egresosDelMes  = totMes.ARS.egresos;
  const balanceDelMes  = totMes.ARS.balance;
  const ingresosDelMesUSD = totMes.USD.ingresos;
  const egresosDelMesUSD  = totMes.USD.egresos;
  const balanceDelMesUSD  = totMes.USD.balance;
  const balanceMesAnterior    = totMesAnt.ARS.balance;
  const balanceMesAnteriorUSD = totMesAnt.USD.balance;

  // Para el análisis por categoría/necesidad.
  //
  // Filtraba `moneda === "ARS"`, así que los gastos en dólares no aparecían en
  // "Gastos por categoría" ni en el corte por necesidad, y no había ningún
  // aviso de que faltaban. Ahora se calcula UNA VEZ POR MONEDA y el bloque
  // ofrece elegir cuál mirar; las monedas siguen sin sumarse entre sí.
  const movMesActual = enMesActual.filter(m =>
    !ajusteInversionIds.includes(m.categoria_id ?? "__")
  );

  // ── Tarjetas: lo que falta pagar, no el consumo bruto ──────────────────────
  // Mostraba el total del ciclo con `calcularConsumoTarjeta`, que sólo suma
  // Egresos: registrabas el pago y el número no se movía. Y la alerta de
  // vencimiento seguía avisando por una tarjeta ya paga.
  const tarjetasResumen = tarjetas.map(t => {
    const tieneCiclo = Boolean(t.cierre_dia && t.vencimiento_dia);
    const ciclo = tieneCiclo
      ? getCicloDelProximoVencimiento(t.cierre_dia!, t.vencimiento_dia!)
      : null;
    const periodo = ciclo ?? getPeriodoCierre(t.cierre_dia);
    const vencimiento = ciclo ? ciclo.fechaVencimiento : getProximoVencimiento(t.vencimiento_dia);

    const saldo = calcularSaldoTarjeta(t.id, movimientos, periodo.inicio, periodo.fin, vencimiento);
    const aPagar = Object.fromEntries(
      Object.entries(saldo).map(([moneda, s]) => [moneda, s.aPagar]),
    );
    const huboConsumo = Object.values(saldo).some(s => s.total > 0);
    const quedaAlgo = Object.values(saldo).some(s => s.aPagar > 0);

    return {
      id: t.id, nombre: t.nombre, tipo: t.tipo, banco_emisor: t.banco_emisor,
      consumo: aPagar,
      pagado: huboConsumo && !quedaAlgo,
      proximoVto: vencimiento,
      cicloAbierto: ciclo ? ciclo.cicloAbierto : false,
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
  const jerarquia = buildJerarquia(categorias);

  const analisisPorMoneda = Object.fromEntries(MONEDAS_ANALISIS.map(moneda => {
    const delMes = movMesActual.filter(m => m.moneda === moneda);
    const egresos = delMes.filter(m => m.tipo === "Egreso");
    // Agrupa por categoría padre y conserva las subcategorías para desplegar.
    const resumen = agruparPorCategoria(delMes, jerarquia, {
      tipo: "Egreso", excluirCategorias: ajusteInversionIds,
    });
    return [moneda, {
      total: resumen.total,
      // `filas` completo: el cruce con presupuestos necesita TODAS las
      // categorías, no sólo las 6 que se muestran.
      filas: resumen.filas,
      topCategorias: resumen.filas.slice(0, 6),
      porNecesidad: [1, 2, 3, 4, 5].map(nivel => ({
        nivel,
        monto: egresos.filter(m => m.necesidad === nivel).reduce((acc, m) => acc + montoPropio(m), 0),
      })),
    }];
  }));

  // Los presupuestos hoy son sólo en pesos, así que su cruce sigue saliendo de
  // la moneda ARS.
  const resumenCats = { total: analisisPorMoneda.ARS.total, filas: analisisPorMoneda.ARS.filas };
  const totalEgMes = resumenCats.total;

  // Lo que viaja al cliente: una entrada por moneda, sin las que están vacías,
  // para que el selector no ofrezca una moneda sin movimientos.
  const analisis = Object.fromEntries(
    Object.entries(analisisPorMoneda)
      .filter(([, a]) => a.total > 0)
      .map(([moneda, a]) => [moneda, {
        total: a.total,
        topCategorias: a.topCategorias,
        porNecesidad: a.porNecesidad.filter(n => n.monto > 0),
      }]),
  );

  // ── Presupuesto vs gastado por categoría (mes actual, ARS) ─────────────────
  // El gasto por categoría padre sale del mismo resumen que el bloque de
  // categorías, así presupuesto y análisis no pueden divergir.
  const gastadoPorPadre: Record<string, number> = Object.fromEntries(
    resumenCats.filas.map(f => [f.id, f.monto]),
  );
  const presupuestos = (presupuestosMes as { categoria_id: string; monto: number }[])
    .map(p => ({
      categoriaId: p.categoria_id,
      nombre: jerarquia.nombreDe.get(p.categoria_id) ?? "Categoría",
      presupuesto: p.monto,
      // El índice está armado por categoría RAÍZ, así que la clave del
      // presupuesto hay que resolverla igual. Si no, presupuestar una categoría
      // y después moverla como subcategoría dejaba la barra en $0 para siempre.
      gastado: gastadoPorPadre[jerarquia.padreDe.get(p.categoria_id) ?? p.categoria_id] ?? 0,
    }))
    .sort((a, b) => (b.gastado / (b.presupuesto || 1)) - (a.gastado / (a.presupuesto || 1)));

  // ── Alertas ────────────────────────────────────────────────────────────────
  const alertas: Alerta[] = [];

  // Tarjetas con vto en los próximos 7 días
  tarjetasResumen.forEach(t => {
    if (!t.proximoVto) return;
    // Si el resumen ya está pago no hay nada que avisar.
    if (t.pagado || !Object.values(t.consumo).some(v => v > 0)) return;
    const dias = Math.ceil(
      (new Date(t.proximoVto + "T12:00:00").getTime() - Date.now()) / 86400000
    );
    if (dias >= 0 && dias <= 7) {
      alertas.push({
        id: `tarjeta-${t.id}`,
        tipo: "tarjeta_vence",
        urgencia: dias <= 3 ? "alta" : "media",
        titulo: `Tarjeta ${t.nombre} vence ${dias === 0 ? "hoy" : `en ${dias}d`}`,
        descripcion: `${fmtMonedas(t.consumo)} por pagar${t.cicloAbierto ? " (ciclo en curso)" : ""}`,
        href: `/tarjetas/${t.id}`,
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

  // Plantillas pendientes próximas o atrasadas (excluir silenciadas)
  const idsSilenciadas = new Set(silenciadasRaw.map(s => s.alerta_referencia));
  const alertasPlantillas = getPlantillasParaAlerta(plantillas, movimientos, now);
  alertasPlantillas
    .filter(p => !idsSilenciadas.has(p.plantilla.id))
    .forEach(p => {
      const dias = Math.abs(p.diasRestantes);
      alertas.push({
        id:            `plantilla-${p.plantilla.id}`,
        tipo:          p.atrasada ? "plantilla_atrasada" : "plantilla_pendiente",
        urgencia:      p.atrasada || p.diasRestantes <= 1 ? "alta" : "media",
        titulo:        p.atrasada
          ? `${p.plantilla.nombre} sin generar (hace ${dias}d)`
          : p.diasRestantes === 0
            ? p.plantilla.tipo === "Ingreso"
              ? `${p.plantilla.nombre} — esperás cobrar hoy`
              : `${p.plantilla.nombre} debita hoy`
            : p.plantilla.tipo === "Ingreso"
              ? `${p.plantilla.nombre} — esperás cobrar en ${dias}d`
              : `${p.plantilla.nombre} debita en ${dias}d`,
        descripcion:   `~${fmtARS(p.plantilla.monto_estimado)} estimado`,
        href:          `/movimientos?generar=${p.plantilla.id}`,
        referencia_id: p.plantilla.id,
      });
    });

  // Cuotas de préstamo con auto-liquidación que faltan aplicar este mes.
  // Se proponen, no se insertan solas: un movimiento que aparece sin que nadie
  // lo pida es peor que uno que falta, porque nadie lo audita.
  getCuotasPendientesDelMes(
    prestamosRaw.map(p => ({
      id: p.id, tipo: p.tipo, institucion_nombre: p.institucion_nombre,
      moneda: p.moneda, cuota_mensual: p.cuota_mensual,
      dia_vencimiento_cuota: p.dia_vencimiento_cuota,
      cantidad_cuotas: p.cantidad_cuotas, estado: p.estado,
      archivado: p.archivado, auto_liquidar: p.auto_liquidar ?? false,
    })),
    (prestamosRaw ?? []).flatMap(p =>
      (p.prestamos_pagos ?? []).map(pg => ({ prestamo_id: p.id, fecha: pg.fecha })),
    ),
    now,
  )
    .filter(c => !idsSilenciadas.has(`cuota-${c.prestamo.id}`))
    .forEach(c => {
      const dias = Math.abs(c.diasRestantes);
      const nombre = c.prestamo.institucion_nombre ?? "Préstamo";
      alertas.push({
        id:            `cuota-prestamo-${c.prestamo.id}`,
        tipo:          c.atrasada ? "plantilla_atrasada" : "plantilla_pendiente",
        urgencia:      c.atrasada || c.diasRestantes <= 1 ? "alta" : "media",
        titulo:        c.atrasada
          ? `Cuota de ${nombre} sin registrar (hace ${dias}d)`
          : c.diasRestantes === 0
            ? `Cuota de ${nombre} vence hoy`
            : `Cuota de ${nombre} vence en ${dias}d`,
        descripcion:   `${fmtARS(c.monto)} · cuota ${c.cuotaNumero}${c.prestamo.cantidad_cuotas ? ` de ${c.prestamo.cantidad_cuotas}` : ""}`,
        href:          `/prestamos/${c.prestamo.id}`,
        referencia_id: `cuota-${c.prestamo.id}`,
      });
    });

  // ── Ensamblar DashboardData ────────────────────────────────────────────────
  const dashboardData: DashboardData = {
    perfil: {
      nombre: perfilData?.nombre ?? "",
      asistente_nombre: perfilData?.asistente_nombre ?? null,
      email: user.email ?? "",
    },
    hero: {
      totalARS, totalUSD,
      ingresosDelMes, egresosDelMes,
      ingresosDelMesUSD, egresosDelMesUSD,
      balanceDelMes, balanceMesAnterior,
      balanceDelMesUSD, balanceMesAnteriorUSD,
    },
    cuentasLiquidas,
    inversiones,
    tarjetas: tarjetasResumen,
    movimientosGrafico: movimientos.filter(m => m.tipo !== "Ingreso" || !m.es_reembolso).map(m => ({
      tipo: m.tipo as MovGrafico["tipo"],
      monto: m.tipo === "Egreso" ? montoPropio(m) : m.monto, moneda: m.moneda, fecha: m.fecha,
      cuenta_id: m.cuenta_id, cuenta_destino_id: m.cuenta_destino_id,
      categoria_id: m.categoria_id,
      necesidad: m.necesidad ?? null,
    })),
    cuentasParaFiltro: cuentasLiquidas.map(c => ({ id: c.id, nombre: c.nombre })),
    ajusteInversionIds,
    prestamos: prestamosResumen,
    compartidos: { totalPendiente: totalCompartidoPendiente, porPersona: compartidosPorPersona },
    analisis,
    presupuestos,
    alertas,
  };

  return <DashboardClient data={dashboardData} />;
}
