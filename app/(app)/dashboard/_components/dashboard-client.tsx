"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, BarChart3, ChevronDown, ChevronRight, CircleDollarSign, Clock, Landmark, Minus, PieChart as PieChartIcon, PiggyBank, TrendingDown, TrendingUp, Wallet, X, type LucideIcon } from "lucide-react";
import { categoriaNombreToLucide } from "@/lib/ui/category-icons";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { MangoBlob } from "@/components/ui/mango-logo";
import { GraficoEvolucion } from "./grafico-evolucion";
import { silenciarAlerta } from "@/lib/supabase/actions/alertas";

// ── Tipos exportados (usados por page.tsx) ────────────────────────────────────

export type MovGrafico = {
  tipo: "Ingreso" | "Egreso" | "Transferencia";
  monto: number; moneda: string; fecha: string;
  cuenta_id: string | null; cuenta_destino_id: string | null;
  categoria_id: string | null; necesidad: number | null;
};

export type CuentaConSaldo = {
  id: string; nombre: string; tipo: string; moneda: string; saldo: number;
  inv_subtipo: string | null; inv_fecha_vencimiento: string | null;
  inv_tasa_anual: number | null; diasRestantes?: number | null;
};

export type TarjetaResumen = {
  id: string; nombre: string; tipo: string | null;
  banco_emisor: string | null; consumo: Record<string, number>; pagado?: boolean; proximoVto: string | null;
  cicloAbierto?: boolean;
};

export type PrestamoResumen = {
  id: string; tipo: "otorgado" | "recibido" | "bancario";
  nombreLabel: string; moneda: string; saldoPendiente: number; cuotaMensual: number | null;
};

export type Alerta = {
  id: string;
  tipo: "tarjeta_vence" | "plazo_fijo_vencido" | "plantilla_pendiente" | "plantilla_atrasada";
  urgencia: "alta" | "media";
  titulo: string; descripcion: string; href: string;
  referencia_id?: string;
};

export interface DashboardData {
  perfil: { nombre: string; asistente_nombre: string | null; email: string };
  hero: {
    totalARS: number; totalUSD: number;
    ingresosDelMes: number; egresosDelMes: number;
    ingresosDelMesUSD: number; egresosDelMesUSD: number;
    balanceDelMes: number; balanceMesAnterior: number;
    balanceDelMesUSD: number; balanceMesAnteriorUSD: number;
  };
  cuentasLiquidas: CuentaConSaldo[];
  inversiones: CuentaConSaldo[];
  tarjetas: TarjetaResumen[];
  movimientosGrafico: MovGrafico[];
  cuentasParaFiltro: { id: string; nombre: string }[];
  ajusteInversionIds: string[];
  prestamos: PrestamoResumen[];
  compartidos: { totalPendiente: number; porPersona: { nombre: string; total: number }[] };
  /** Una entrada por moneda con movimientos. Las monedas no se suman entre sí. */
  analisis: Record<string, {
    total: number;
    topCategorias: {
      id: string; nombre: string; monto: number; porcentaje: number;
      hijos: { id: string; nombre: string; monto: number; porcentaje: number }[];
    }[];
    porNecesidad: { nivel: number; monto: number }[];
  }>;
  presupuestos?: { categoriaId: string; nombre: string; presupuesto: number; gastado: number }[];
  alertas: Alerta[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: moneda,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

const SUBTIPO_LABELS: Record<string, string> = {
  plazo_fijo: "Plazo fijo", cripto: "Cripto", fci: "FCI",
  acciones: "Acciones", usd_fisico: "USD físico", balanz: "Balanz", otros: "Otros",
};

const SUBTIPO_COLORS: Record<string, string> = {
  plazo_fijo: "bg-warning/10 text-warning border-warning/20",
  cripto:     "bg-info/10 text-info border-info/20",
  fci:        "bg-info/10 text-info border-info/20",
  acciones:   "bg-info/10 text-info border-info/20",
  usd_fisico: "bg-success/10 text-success border-success/20",
  balanz:     "bg-info/10 text-info border-info/20",
  otros:      "bg-muted/50 text-muted-foreground border-border",
};

const NECESIDAD_CHART_COLORS: Record<number, string> = {
  1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#10b981", 5: "#10b981",
};

const BLOQUE_LABELS: Record<string, string> = {
  grafico: "Gráfico", cuentas: "Cuentas",
  compartidos: "Compartidos", prestamos: "Préstamos", inversiones: "Inversiones",
  analisis: "Análisis", alertas: "Alertas",
};

// ── Block toggle hook ─────────────────────────────────────────────────────────

function useBlockToggle() {
  const [hiddenBlocks, setHiddenBlocks] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dashboard_hidden_blocks");
      if (stored) setHiddenBlocks(JSON.parse(stored));
    } catch {}
  }, []);

  function toggleBlock(id: string) {
    setHiddenBlocks(prev => {
      const next = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id];
      try { localStorage.setItem("dashboard_hidden_blocks", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return { hiddenBlocks, toggleBlock };
}

// ── DashBlock wrapper ─────────────────────────────────────────────────────────

function DashBlock({
  id, title, hiddenBlocks, onToggle, className, children,
}: {
  id: string; title: string; hiddenBlocks: string[];
  onToggle: (id: string) => void; className?: string; children: React.ReactNode;
}) {
  if (hiddenBlocks.includes(id)) return null;
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <button
          onClick={() => onToggle(id)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors"
          title="Ocultar bloque"
        >
          <X className="h-3 w-3" />
          Ocultar
        </button>
      </div>
      {children}
    </section>
  );
}

// ── Stat card (chip de ícono + label + cifra) ─────────────────────────────────

function StatCard({
  icon: Icon, chipBg, iconColor, label, value, valueClass,
}: {
  icon: LucideIcon; chipBg: string; iconColor: string;
  label: React.ReactNode; value: React.ReactNode; valueClass?: string;
}) {
  return (
    <div className="mango-card-muted p-4">
      <div
        className="flex items-center justify-center rounded-[9px]"
        style={{ width: 30, height: 30, background: chipBg }}
      >
        <Icon className="h-4 w-4" style={{ color: iconColor }} />
      </div>
      <p className="text-xs text-muted-foreground mt-2">{label}</p>
      <p className={cn("text-[17px] font-bold tabular-nums font-mono mt-0.5", valueClass)}>
        {value}
      </p>
    </div>
  );
}

// ── Hero financiero ───────────────────────────────────────────────────────────

function HeroFinanciero({ hero, perfil }: { hero: DashboardData["hero"]; perfil: DashboardData["perfil"] }) {
  // Un delta y un % de ahorro POR MONEDA: nunca se mezclan entre sí.
  function deltaDe(actual: number, anterior: number) {
    return anterior !== 0 ? Math.round(((actual - anterior) / Math.abs(anterior)) * 100) : null;
  }
  function ahorroDe(ingresos: number, egresos: number) {
    return ingresos > 0 ? Math.round(((ingresos - egresos) / ingresos) * 100) : null;
  }

  const monedas = [
    {
      code: "ARS" as const,
      label: "Pesos",
      total: hero.totalARS,
      ingresos: hero.ingresosDelMes,
      egresos: hero.egresosDelMes,
      delta: deltaDe(hero.balanceDelMes, hero.balanceMesAnterior),
      ahorro: ahorroDe(hero.ingresosDelMes, hero.egresosDelMes),
    },
    {
      code: "USD" as const,
      label: "Dólares",
      total: hero.totalUSD,
      ingresos: hero.ingresosDelMesUSD,
      egresos: hero.egresosDelMesUSD,
      delta: deltaDe(hero.balanceDelMesUSD, hero.balanceMesAnteriorUSD),
      ahorro: ahorroDe(hero.ingresosDelMesUSD, hero.egresosDelMesUSD),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">
            {`Hola, ${perfil.nombre
              ? perfil.nombre.split(" ")[0]
              : perfil.email.split("@")[0]}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Resumen financiero de hoy</p>
        </div>
        <Link
          href="/cash-flow"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-surface transition-colors"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Ver proyección
        </Link>
      </div>

      {/* Hero navy — patrimonio por moneda, ambas del mismo tamaño */}
      <div className="mango-card-navy p-[26px] text-white">
        <MangoBlob size={260} style={{ right: -70, top: -90 }} />
        <MangoBlob size={170} style={{ right: 110, bottom: -95 }} />
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4">
          {monedas.map((m) => (
            <div key={m.code} className="min-w-0">
              <p className="text-[13px] font-medium text-cream">{m.label}</p>
              <p
                className="mt-1 font-mono font-semibold tracking-tight text-white truncate"
                style={{ fontSize: 36, lineHeight: 1.05 }}
              >
                {fmt(m.total, m.code)}
              </p>
              {m.delta !== null && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-[20px] bg-cream px-2.5 py-1 text-xs font-semibold text-navy">
                  {m.delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : m.delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  {m.delta > 0 ? "+" : ""}{m.delta}% vs mes anterior
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* KPIs del mes: cada tarjeta muestra las DOS monedas con el mismo peso */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={ArrowDownLeft} chipBg="#e6f6ef" iconColor="#0b7a52"
          label="Ingresos del mes"
          value={<DosMonedas ars={fmt(hero.ingresosDelMes)} usd={fmt(hero.ingresosDelMesUSD, "USD")} />}
          valueClass="text-success"
        />
        <StatCard
          icon={ArrowUpRight} chipBg="#fdeaea" iconColor="#c0362f"
          label="Gastos del mes"
          value={<DosMonedas ars={fmt(hero.egresosDelMes)} usd={fmt(hero.egresosDelMesUSD, "USD")} />}
          valueClass="text-danger"
        />
        <StatCard
          icon={PiggyBank} chipBg="#f3ecdc" iconColor="#1e3a5f"
          label="Ahorro del mes"
          value={
            <DosMonedas
              ars={monedas[0].ahorro !== null ? `${monedas[0].ahorro}%` : "—"}
              usd={monedas[1].ahorro !== null ? `${monedas[1].ahorro}%` : "—"}
            />
          }
        />
      </div>
    </div>
  );
}

/** Dos monedas en paralelo, mismo tamaño; la etiqueta ARS/USD las distingue. */
function DosMonedas({ ars, usd }: { ars: string; usd: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-sans font-medium text-muted-foreground w-7 shrink-0">ARS</span>
        <span className="truncate">{ars}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-[10px] font-sans font-medium text-muted-foreground w-7 shrink-0">USD</span>
        <span className="truncate">{usd}</span>
      </span>
    </span>
  );
}

/** Totales por moneda, del mismo tamaño; muestra $0 si no hay nada. */
function TotalesMoneda({ totales, className }: { totales: Record<string, number>; className?: string }) {
  const conSaldo = Object.entries(totales).filter(([, v]) => v !== 0);
  if (conSaldo.length === 0) {
    return <p className="text-lg font-bold tabular-nums font-mono mt-0.5 text-muted-foreground">$0</p>;
  }
  return (
    <div className="mt-0.5 space-y-0.5">
      {conSaldo.map(([moneda, v]) => (
        <p key={moneda} className={cn("text-lg font-bold tabular-nums font-mono", className)}>
          {fmt(v, moneda)}
        </p>
      ))}
    </div>
  );
}

/** Consumo de una tarjeta: una línea por moneda (ARS y USD no se suman). */
function ConsumoPorMoneda({ consumo, pagado }: { consumo: Record<string, number>; pagado?: boolean }) {
  const conSaldo = Object.entries(consumo).filter(([, v]) => v > 0);
  // El número es lo que FALTA pagar. Sin saldo y con consumo en el ciclo, el
  // resumen está saldado: decirlo explícitamente evita leer el cero como "no
  // gastaste nada".
  if (pagado && conSaldo.length === 0) {
    return (
      <span className="text-xs font-medium text-success whitespace-nowrap">
        Pagado
      </span>
    );
  }
  if (conSaldo.length === 0) {
    return <span className="font-semibold tabular-nums font-mono text-sm text-muted-foreground">$0</span>;
  }
  return (
    <span className="flex flex-col items-end">
      {conSaldo.map(([moneda, v]) => (
        <span key={moneda} className="font-semibold tabular-nums font-mono text-sm text-danger">
          {fmt(v, moneda)}
        </span>
      ))}
    </span>
  );
}

// ── Bloque Cuentas ────────────────────────────────────────────────────────────

function BloqueCuentas({ cuentas, tarjetas }: { cuentas: CuentaConSaldo[]; tarjetas: TarjetaResumen[] }) {
  const [verTodas, setVerTodas] = useState(false);
  const ordenadas = [...cuentas].sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));
  const visibles = verTodas ? ordenadas : ordenadas.slice(0, 3);
  return (
    <div className="space-y-3">
      {/* Cuentas */}
      {visibles.length > 0 && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {visibles.map(c => (
            <Link key={c.id} href={`/cuentas/${c.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-surface/50 transition-colors">
              <div>
                <p className="text-sm font-medium">{c.nombre}</p>
                <p className="text-xs text-muted-foreground">{c.tipo} · {c.moneda}</p>
              </div>
              <span className={cn("font-semibold tabular-nums font-mono text-sm", c.saldo >= 0 ? "text-success" : "text-danger")}>
                {fmt(c.saldo, c.moneda)}
              </span>
            </Link>
          ))}
          {ordenadas.length > 3 && (
            <button
              type="button"
              onClick={() => setVerTodas(v => !v)}
              className="w-full px-4 py-2.5 text-xs text-muted-foreground hover:text-gold transition-colors text-center"
            >
              {verTodas ? "Ver menos" : `Ver todas las cuentas (${ordenadas.length})`}
            </button>
          )}
        </div>
      )}

      {/* Tarjetas */}
      {tarjetas.length > 0 && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {tarjetas.map(t => (
            <Link key={t.id} href={`/tarjetas/${t.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-surface/50 transition-colors">
              <div>
                <p className="text-sm font-medium">{t.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {t.tipo ?? "—"}{t.banco_emisor ? ` · ${t.banco_emisor}` : ""}
                  {t.proximoVto ? ` · vto ${fmtDate(t.proximoVto)}` : ""}
                </p>
              </div>
              <ConsumoPorMoneda consumo={t.consumo} pagado={t.pagado} />
            </Link>
          ))}
        </div>
      )}

      <Link href="/cuentas" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors">
        Ver patrimonio completo <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Bloque Compartidos ────────────────────────────────────────────────────────

function BloqueCompartidos({ datos }: { datos: DashboardData["compartidos"] }) {
  return (
    <div className="space-y-3">
      <div className="mango-card p-[22px] flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Te deben en total</p>
          <p className="text-xl font-bold tabular-nums font-mono mt-0.5 text-success">{fmt(datos.totalPendiente)}</p>
        </div>
        <CircleDollarSign className="h-8 w-8 text-muted-foreground/30" />
      </div>

      {datos.porPersona.length > 0 && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {datos.porPersona.map(p => (
            <div key={p.nombre} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">{p.nombre}</span>
              <span className="text-sm font-semibold tabular-nums font-mono text-success">{fmt(p.total)}</span>
            </div>
          ))}
        </div>
      )}

      <Link href="/movimientos?compartido=true" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors">
        Ver movimientos compartidos <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Bloque Préstamos ──────────────────────────────────────────────────────────

function BloquePrestamos({ prestamos }: { prestamos: PrestamoResumen[] }) {
  const otorgados = prestamos.filter(p => p.tipo === "otorgado");
  const deudas = prestamos.filter(p => p.tipo !== "otorgado");
  // Antes los préstamos en USD se descartaban (se sumaba 0). Ahora van aparte.
  const porMoneda = (arr: PrestamoResumen[]) =>
    arr.reduce<Record<string, number>>((acc, p) => {
      acc[p.moneda] = (acc[p.moneda] ?? 0) + p.saldoPendiente;
      return acc;
    }, {});
  const totalTeDeban = porMoneda(otorgados);
  const totalDebas = porMoneda(deudas);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="mango-card p-4">
          <p className="text-xs text-muted-foreground">Te deben</p>
          <TotalesMoneda totales={totalTeDeban} className="text-success" />
        </div>
        <div className="mango-card p-4">
          <p className="text-xs text-muted-foreground">Debés</p>
          <TotalesMoneda totales={totalDebas} className="text-danger" />
        </div>
      </div>

      {prestamos.length > 0 && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {prestamos.slice(0, 4).map(p => (
            <Link key={p.id} href={`/prestamos/${p.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-surface/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Landmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.nombreLabel}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.tipo}</p>
                </div>
              </div>
              <span className={cn(
                "text-sm font-semibold tabular-nums font-mono shrink-0 ml-2",
                p.tipo === "otorgado" ? "text-success" : "text-danger"
              )}>
                {fmt(p.saldoPendiente, p.moneda)}
              </span>
            </Link>
          ))}
        </div>
      )}

      <Link href="/prestamos" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors">
        Ver préstamos <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Bloque Inversiones ────────────────────────────────────────────────────────

function BloqueInversiones({ inversiones }: { inversiones: CuentaConSaldo[] }) {
  const totalARS = inversiones.filter(i => i.moneda === "ARS").reduce((acc, i) => acc + i.saldo, 0);
  const totalUSD = inversiones.filter(i => i.moneda === "USD").reduce((acc, i) => acc + i.saldo, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {totalARS > 0 && (
          <div className="mango-card p-4">
            <p className="text-xs text-muted-foreground">Total invertido ARS</p>
            <p className="text-lg font-bold tabular-nums font-mono mt-0.5 text-success">{fmt(totalARS)}</p>
          </div>
        )}
        {totalUSD > 0 && (
          <div className="mango-card p-4">
            <p className="text-xs text-muted-foreground">Total invertido USD</p>
            <p className="text-lg font-bold tabular-nums font-mono mt-0.5 text-success">{fmt(totalUSD, "USD")}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {inversiones.slice(0, 5).map(inv => {
          const subtipo = inv.inv_subtipo ?? "otros";
          const vencida = inv.diasRestantes !== null && inv.diasRestantes !== undefined && inv.diasRestantes <= 0;
          return (
            <Link key={inv.id} href={`/cuentas/${inv.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-surface/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inv.nombre}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0 rounded-full text-xs font-medium border",
                      SUBTIPO_COLORS[subtipo] ?? SUBTIPO_COLORS.otros
                    )}>
                      {SUBTIPO_LABELS[subtipo] ?? subtipo}
                    </span>
                    {vencida && (
                      <span className="inline-flex items-center px-1.5 py-0 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20">
                        Vencido
                      </span>
                    )}
                    {!vencida && inv.diasRestantes !== null && inv.diasRestantes !== undefined && (
                      <span className="text-xs text-muted-foreground">{inv.diasRestantes}d</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums font-mono shrink-0 ml-2 text-success">
                {fmt(inv.saldo, inv.moneda)}
              </span>
            </Link>
          );
        })}
      </div>

      <Link href="/cuentas" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors">
        Ver cuentas <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Bloque Análisis ───────────────────────────────────────────────────────────

function BloqueAnalisis({ analisis }: { analisis: DashboardData["analisis"] }) {
  const monedas = Object.keys(analisis);
  const [moneda, setMoneda] = useState(monedas[0] ?? "ARS");
  const [abierta, setAbierta] = useState<string | null>(null);

  // La moneda elegida puede desaparecer al cambiar de mes.
  const activa = analisis[moneda] ?? analisis[monedas[0] ?? ""] ;
  if (!activa) return null;
  const { topCategorias, porNecesidad } = activa;

  return (
    <div className="space-y-4">
      {/* Antes este bloque filtraba ARS en silencio y los gastos en dólares no
          aparecían en ningún lado. El selector sólo se muestra si de verdad hay
          más de una moneda en el mes. */}
      {monedas.length > 1 && (
        <div className="flex gap-1.5">
          {monedas.map(m => (
            <button
              key={m} type="button" onClick={() => { setMoneda(m); setAbierta(null); }}
              className={cn(
                "px-2.5 py-1 rounded-[var(--radius-pill)] text-xs font-medium border transition-colors",
                m === moneda
                  ? "bg-navy text-white border-navy"
                  : "border-border text-muted-foreground hover:border-foreground/40",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}
      {/* Gastos por categoría — desplegable a subcategorías */}
      {topCategorias.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gastos por categoría</p>
          {topCategorias.map(cat => {
            const Icon = categoriaNombreToLucide(cat.nombre);
            const tieneHijos = cat.hijos.length > 0;
            const abiertaEsta = abierta === cat.id;
            return (
              <div key={cat.id}>
                <button
                  type="button"
                  disabled={!tieneHijos}
                  onClick={() => setAbierta(abiertaEsta ? null : cat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 text-left rounded-lg transition-colors",
                    tieneHijos && "hover:bg-surface active:bg-surface-2",
                  )}
                >
                  <div
                    className="flex items-center justify-center rounded-[10px] shrink-0"
                    style={{ width: 34, height: 34, background: "#f3ecdc" }}
                  >
                    <Icon className="h-[17px] w-[17px]" style={{ color: "#1e3a5f" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate flex items-center gap-1">
                        {cat.nombre}
                        {tieneHijos && (
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150",
                              !abiertaEsta && "-rotate-90",
                            )}
                          />
                        )}
                      </span>
                      <span className="flex items-baseline gap-2 shrink-0">
                        {/* El % es sobre el total del mes: la barra anterior era
                            relativa a la categoría más grande y confundía. */}
                        <span className="text-xs text-muted-foreground tabular-nums">{cat.porcentaje}%</span>
                        <span className="text-sm font-bold tabular-nums font-mono">{fmt(cat.monto, moneda)}</span>
                      </span>
                    </div>
                  </div>
                </button>

                {abiertaEsta && (
                  <div className="mt-1 ml-[46px] space-y-1">
                    {cat.hijos.map(h => (
                      <div key={h.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground truncate">{h.nombre}</span>
                        <span className="flex items-baseline gap-2 shrink-0">
                          <span className="text-[11px] text-muted-foreground tabular-nums">{h.porcentaje}%</span>
                          <span className="text-xs tabular-nums font-mono">{fmt(h.monto, moneda)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Por necesidad */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Necesidad - pie chart */}
        {porNecesidad.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Por necesidad</p>
            <div className="flex items-center gap-4">
              <PieChart width={100} height={100}>
                <Pie
                  data={porNecesidad.map(n => ({ name: `N${n.nivel}`, value: n.monto, nivel: n.nivel }))}
                  cx={50} cy={50} outerRadius={46} innerRadius={22}
                  dataKey="value" strokeWidth={2} stroke="hsl(var(--background))"
                >
                  {porNecesidad.map(n => (
                    <Cell key={n.nivel} fill={NECESIDAD_CHART_COLORS[n.nivel] ?? "#6b7280"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v as number)} />
              </PieChart>
              <div className="flex flex-col gap-1">
                {porNecesidad.map(n => (
                  <div key={n.nivel} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NECESIDAD_CHART_COLORS[n.nivel] ?? "#6b7280" }} />
                    <span className="text-muted-foreground">N{n.nivel}</span>
                    <span className="font-medium tabular-nums font-mono">{fmt(n.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bloque Alertas ────────────────────────────────────────────────────────────

function BloqueAlertas({
  alertas,
  onSilenciar,
}: {
  alertas: Alerta[];
  onSilenciar: (alerta: Alerta) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {alertas.map(a => {
        const puedeSilenciar =
          (a.tipo === "plantilla_pendiente" || a.tipo === "plantilla_atrasada") &&
          !!a.referencia_id;
        return (
          <div key={a.id} className={cn(
            "flex items-center rounded-[var(--radius-card)] border",
            a.urgencia === "alta"
              ? "border-danger/25 bg-danger/[0.07]"
              : "border-[var(--alert-border)] bg-[var(--alert-bg)]",
          )}>
            <Link href={a.href} className="flex flex-1 items-start gap-3 p-4 transition-colors hover:bg-black/[0.02] min-w-0 rounded-[var(--radius-card)]">
              <span className={cn(
                "grid place-items-center h-7 w-7 rounded-[9px] shrink-0",
                a.urgencia === "alta" ? "bg-danger" : "bg-warning",
              )}>
                <AlertTriangle className="h-4 w-4 text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.descripcion}</p>
              </div>
              {!puedeSilenciar && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
            </Link>
            {puedeSilenciar && (
              <button
                className="mr-3 shrink-0 inline-flex items-center gap-1 rounded-[var(--radius-chip)] border border-[var(--alert-border)] bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-gold"
                title="Silenciar por este mes"
                onClick={() => onSilenciar(a)}
              >
                <X className="h-3 w-3" />
                <span className="hidden sm:inline">Silenciar por este mes</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── DashboardClient (componente principal) ────────────────────────────────────

export function DashboardClient({ data }: { data: DashboardData }) {
  const { hiddenBlocks, toggleBlock } = useBlockToggle();
  const router = useRouter();

  async function handleSilenciar(alerta: Alerta) {
    if (!alerta.referencia_id) return;
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const silenciada_hasta = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
    await silenciarAlerta({
      alerta_tipo: alerta.tipo as "plantilla_pendiente" | "plantilla_atrasada",
      alerta_referencia: alerta.referencia_id,
      silenciada_hasta,
    });
    router.refresh();
  }

  // Determinar qué IDs de bloques son ocultables y están disponibles
  const bloquesDisponibles = [
    "grafico", "cuentas", "prestamos",
    ...(data.inversiones.length > 0 ? ["inversiones"] : []),
    ...(data.compartidos.totalPendiente > 0 ? ["compartidos"] : []),
    "analisis",
  ];
  const bloquesOcultos = hiddenBlocks.filter(id => bloquesDisponibles.includes(id));

  return (
    <div className="flex flex-col gap-6">
      {/* Banner bloques ocultos */}
      {bloquesOcultos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap border border-border rounded-lg px-3 py-2 bg-surface/30">
          <span className="text-xs text-muted-foreground shrink-0">Ocultos:</span>
          {bloquesOcultos.map(id => (
            <button
              key={id}
              onClick={() => toggleBlock(id)}
              className="px-2 py-0.5 rounded-md bg-surface hover:bg-surface-2 text-xs text-foreground border border-border transition-colors"
            >
              + {BLOQUE_LABELS[id]}
            </button>
          ))}
        </div>
      )}

      {/* Hero — no ocultable */}
      <HeroFinanciero hero={data.hero} perfil={data.perfil} />

      {/* Alertas — fijas arriba, solo si hay (ocultables pero no aparecen en banner) */}
      {data.alertas.length > 0 && !hiddenBlocks.includes("alertas") && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Alertas</h2>
            <button
              onClick={() => toggleBlock("alertas")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors"
            >
              <X className="h-3 w-3" />
              Ocultar
            </button>
          </div>
          <BloqueAlertas alertas={data.alertas} onSilenciar={handleSilenciar} />
        </section>
      )}

      {/* Tablero: los bloques se acomodan en grilla y cada uno ocupa sólo su
          alto natural (items-start), en vez de apilarse a ancho completo. */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">

      {/* Gráfico evolución — a lo ancho: necesita el eje largo */}
      <DashBlock id="grafico" title="Evolución mensual" hiddenBlocks={hiddenBlocks} onToggle={toggleBlock} className="lg:col-span-2">
        <GraficoEvolucion
          movimientos={data.movimientosGrafico}
          cuentas={data.cuentasParaFiltro}
          ajusteInversionIds={data.ajusteInversionIds}
        />
      </DashBlock>

      {/* Cuentas y tarjetas */}
      <DashBlock id="cuentas" title="Cuentas y tarjetas" hiddenBlocks={hiddenBlocks} onToggle={toggleBlock}>
        <BloqueCuentas cuentas={data.cuentasLiquidas} tarjetas={data.tarjetas} />
      </DashBlock>

      {/* Análisis — al lado de Cuentas: son los dos que más se miran */}
      {Object.keys(data.analisis).length > 0 && (
        <DashBlock id="analisis" title="Análisis del mes" hiddenBlocks={hiddenBlocks} onToggle={toggleBlock}>
          <BloqueAnalisis analisis={data.analisis} />
        </DashBlock>
      )}

      {/* Préstamos */}
      {data.prestamos.length > 0 && (
        <DashBlock id="prestamos" title="Préstamos" hiddenBlocks={hiddenBlocks} onToggle={toggleBlock}>
          <BloquePrestamos prestamos={data.prestamos} />
        </DashBlock>
      )}

      {/* Inversiones */}
      {data.inversiones.length > 0 && (
        <DashBlock id="inversiones" title="Inversiones" hiddenBlocks={hiddenBlocks} onToggle={toggleBlock}>
          <BloqueInversiones inversiones={data.inversiones} />
        </DashBlock>
      )}

      {/* Compartidos */}
      {data.compartidos.totalPendiente > 0 && (
        <DashBlock id="compartidos" title="Gastos compartidos" hiddenBlocks={hiddenBlocks} onToggle={toggleBlock}>
          <BloqueCompartidos datos={data.compartidos} />
        </DashBlock>
      )}

      {/* Presupuesto del mes (gastado vs objetivo por categoría) */}
      {data.presupuestos && data.presupuestos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Presupuesto del mes</h2>
            <Link href="/presupuestos" className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1">
              Editar <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-lg border border-border divide-y divide-border">
            {data.presupuestos.map(p => {
              const pct = p.presupuesto > 0 ? Math.min(100, Math.round((p.gastado / p.presupuesto) * 100)) : 0;
              const excedido = p.gastado > p.presupuesto;
              return (
                <div key={p.categoriaId} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between text-sm gap-3">
                    <span className="font-medium truncate">{p.nombre}</span>
                    <span className={cn("tabular-nums font-mono text-xs shrink-0", excedido ? "text-danger" : "text-muted-foreground")}>
                      {fmt(p.gastado)} / {fmt(p.presupuesto)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border/40">
                    <div className={cn("h-full rounded-full transition-all", excedido ? "bg-danger" : "bg-success")} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
