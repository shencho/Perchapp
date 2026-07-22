"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, Minus, X, AlertTriangle,
  Clock, Landmark, Wallet, ChevronRight,
  CircleDollarSign, PieChart as PieChartIcon, BarChart3,
  ArrowDownLeft, ArrowUpRight, PiggyBank, type LucideIcon,
} from "lucide-react";
import { categoriaNombreToLucide } from "@/lib/ui/category-icons";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
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
  banco_emisor: string | null; consumo: number; proximoVto: string | null;
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
    balanceDelMes: number; balanceMesAnterior: number;
  };
  cuentasLiquidas: CuentaConSaldo[];
  inversiones: CuentaConSaldo[];
  tarjetas: TarjetaResumen[];
  movimientosGrafico: MovGrafico[];
  cuentasParaFiltro: { id: string; nombre: string }[];
  ajusteInversionIds: string[];
  prestamos: PrestamoResumen[];
  compartidos: { totalPendiente: number; porPersona: { nombre: string; total: number }[] };
  analisis: {
    topCategorias: { id: string; nombre: string; monto: number; porcentaje: number }[];
    porNecesidad: { nivel: number; monto: number }[];
  };
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
  id, title, hiddenBlocks, onToggle, children,
}: {
  id: string; title: string; hiddenBlocks: string[];
  onToggle: (id: string) => void; children: React.ReactNode;
}) {
  if (hiddenBlocks.includes(id)) return null;
  return (
    <section className="space-y-3">
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
    <div className="border border-border rounded-[12px] p-4 bg-card">
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
  const delta = hero.balanceMesAnterior !== 0
    ? Math.round((hero.balanceDelMes - hero.balanceMesAnterior) / Math.abs(hero.balanceMesAnterior) * 100)
    : null;
  const ahorroPct = hero.ingresosDelMes > 0
    ? Math.round(((hero.ingresosDelMes - hero.egresosDelMes) / hero.ingresosDelMes) * 100)
    : null;

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

      {/* Hero navy — Balance total (absorbe Patrimonio + Balance del mes) */}
      <div className="relative overflow-hidden rounded-[16px] bg-navy p-6 text-white">
        <div className="pointer-events-none absolute rounded-full" style={{ width: 220, height: 220, right: -60, top: -80, background: "#27476f" }} />
        <div className="pointer-events-none absolute rounded-full" style={{ width: 160, height: 160, right: 90, bottom: -80, background: "#24426a" }} />
        <div className="relative">
          <p className="text-[13px] font-medium text-cream">Balance total</p>
          <p className="mt-1 font-mono font-bold tracking-tight" style={{ fontSize: 34, lineHeight: 1.1 }}>
            {fmt(hero.totalARS)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {delta !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-navy">
                {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                {delta > 0 ? "+" : ""}{delta}% vs mes anterior
              </span>
            )}
            {hero.totalUSD !== 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: "rgba(255,255,255,0.12)" }}>
                {fmt(hero.totalUSD, "USD")} USD
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={ArrowDownLeft} chipBg="#e6f6ef" iconColor="#0b7a52"
          label="Ingresos del mes" value={fmt(hero.ingresosDelMes)} valueClass="text-success"
        />
        <StatCard
          icon={ArrowUpRight} chipBg="#fdeaea" iconColor="#c0362f"
          label="Gastos del mes" value={fmt(hero.egresosDelMes)} valueClass="text-danger"
        />
        <StatCard
          icon={PiggyBank} chipBg="#f3ecdc" iconColor="#1e3a5f"
          label={ahorroPct !== null ? "Ahorro del mes" : "Sin ingresos"}
          value={ahorroPct !== null ? `${ahorroPct}%` : "—"}
        />
      </div>
    </div>
  );
}

// ── Bloque Cuentas ────────────────────────────────────────────────────────────

function BloqueCuentas({ cuentas, tarjetas }: { cuentas: CuentaConSaldo[]; tarjetas: TarjetaResumen[] }) {
  const top3 = [...cuentas].sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo)).slice(0, 3);
  return (
    <div className="space-y-3">
      {/* Cuentas */}
      {top3.length > 0 && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {top3.map(c => (
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
        </div>
      )}

      {/* Tarjetas */}
      {tarjetas.length > 0 && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {tarjetas.map(t => (
            <Link key={t.id} href={`/cuentas/tarjetas/${t.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-surface/50 transition-colors">
              <div>
                <p className="text-sm font-medium">{t.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {t.tipo ?? "—"}{t.banco_emisor ? ` · ${t.banco_emisor}` : ""}
                  {t.proximoVto ? ` · vto ${fmtDate(t.proximoVto)}` : ""}
                </p>
              </div>
              <span className={cn("font-semibold tabular-nums font-mono text-sm", t.consumo > 0 ? "text-danger" : "text-muted-foreground")}>
                {t.consumo > 0 ? fmt(t.consumo) : "$0"}
              </span>
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
      <div className="border border-border rounded-lg p-4 bg-card flex items-center justify-between">
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
  const totalTeDeban = otorgados.reduce((acc, p) => acc + (p.moneda === "ARS" ? p.saldoPendiente : 0), 0);
  const totalDebas = deudas.reduce((acc, p) => acc + (p.moneda === "ARS" ? p.saldoPendiente : 0), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-xs text-muted-foreground">Te deben</p>
          <p className="text-lg font-bold tabular-nums font-mono mt-0.5 text-success">{fmt(totalTeDeban)}</p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <p className="text-xs text-muted-foreground">Debés</p>
          <p className="text-lg font-bold tabular-nums font-mono mt-0.5 text-danger">{fmt(totalDebas)}</p>
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
          <div className="border border-border rounded-lg p-3 bg-card">
            <p className="text-xs text-muted-foreground">Total invertido ARS</p>
            <p className="text-lg font-bold tabular-nums font-mono mt-0.5 text-success">{fmt(totalARS)}</p>
          </div>
        )}
        {totalUSD > 0 && (
          <div className="border border-border rounded-lg p-3 bg-card">
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
  const { topCategorias, porNecesidad } = analisis;

  return (
    <div className="space-y-4">
      {/* Gastos por categoría */}
      {topCategorias.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gastos por categoría</p>
          {topCategorias.map(cat => {
            const Icon = categoriaNombreToLucide(cat.nombre);
            const maxMonto = topCategorias[0].monto || 1;
            const barPct = Math.round((cat.monto / maxMonto) * 100);
            return (
              <div key={cat.id} className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-[10px] shrink-0"
                  style={{ width: 34, height: 34, background: "#f3ecdc" }}
                >
                  <Icon className="h-[17px] w-[17px]" style={{ color: "#1e3a5f" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{cat.nombre}</span>
                    <span className="text-sm font-bold tabular-nums font-mono shrink-0">{fmt(cat.monto)}</span>
                  </div>
                  <div className="mt-1 h-[5px] bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-navy rounded-full" style={{ width: `${barPct}%` }} />
                  </div>
                </div>
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
            "flex items-center rounded-lg border",
            a.urgencia === "alta"
              ? "border-danger/20 bg-danger/10"
              : "border-warning/20 bg-warning/10",
          )}>
            <Link href={a.href} className="flex flex-1 items-start gap-3 p-3 transition-colors hover:bg-surface/50 min-w-0">
              <AlertTriangle className={cn(
                "h-4 w-4 mt-0.5 shrink-0",
                a.urgencia === "alta" ? "text-danger" : "text-warning",
              )} />
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.descripcion}</p>
              </div>
              {!puedeSilenciar && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
            </Link>
            {puedeSilenciar && (
              <button
                className="px-3 py-3 text-muted-foreground hover:text-gold transition-colors shrink-0"
                title="Silenciar esta alerta"
                onClick={() => onSilenciar(a)}
              >
                <X className="h-3.5 w-3.5" />
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

      {/* Gráfico evolución */}
      <DashBlock id="grafico" title="Evolución mensual" hiddenBlocks={hiddenBlocks} onToggle={toggleBlock}>
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

      {/* Análisis */}
      {(data.analisis.topCategorias.length > 0 || data.analisis.porNecesidad.length > 0) && (
        <DashBlock id="analisis" title="Análisis del mes" hiddenBlocks={hiddenBlocks} onToggle={toggleBlock}>
          <BloqueAnalisis analisis={data.analisis} />
        </DashBlock>
      )}
    </div>
  );
}
