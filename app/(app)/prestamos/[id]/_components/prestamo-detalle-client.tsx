"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Archive, Plus, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calcularSaldoPrestamo } from "@/lib/domain/calcularSaldoPrestamo";
import { archivarPrestamo, cancelarPrestamo } from "@/lib/supabase/actions/prestamos";
import { eliminarPago } from "@/lib/supabase/actions/prestamos-pagos";
import { PrestamoEditor } from "../../_components/prestamo-editor";
import { RegistrarPagoPrestamoModal } from "./registrar-pago-prestamo-modal";
import { EditarPagoPrestamoModal } from "./editar-pago-prestamo-modal";
import type { Cuenta, Persona, Prestamo } from "@/types/supabase";
import type { PrestamoConPagos } from "@/lib/supabase/actions/prestamos";
import type { PrestamoPagoConMovimiento } from "@/lib/supabase/actions/prestamos-pagos";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMonto(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatFecha(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calcularProximaFecha(fechaInicio: string, cuotasPagadas: number, diaVenc: number | null): string {
  const inicio = new Date(fechaInicio + "T12:00:00");
  const año = inicio.getFullYear();
  const mes = inicio.getMonth() + cuotasPagadas + 1;
  const dia = diaVenc ?? inicio.getDate();
  const fecha = new Date(año, mes, dia);
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

const TIPO_CONFIG = {
  otorgado: { label: "Otorgado", icon: TrendingUp,  color: "bg-green-900/40 text-green-300 border-green-800/60" },
  recibido: { label: "Recibido", icon: TrendingDown, color: "bg-orange-900/40 text-orange-300 border-orange-800/60" },
  bancario: { label: "Bancario", icon: Building2,    color: "bg-blue-900/40 text-blue-300 border-blue-800/60" },
} as const;

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  prestamo: PrestamoConPagos;
  pagos: PrestamoPagoConMovimiento[];
  cuentas: Cuenta[];
  personas: Persona[];
}

export function PrestamoDetalleClient({ prestamo, pagos, cuentas, personas }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [editorOpen, setEditorOpen]           = useState(false);
  const [registrarOpen, setRegistrarOpen]     = useState(false);
  const [editandoPago, setEditandoPago]       = useState<PrestamoPagoConMovimiento | null>(null);
  const [eliminando, setEliminando]           = useState(false);

  const { totalPagado, saldoPendiente, porcentajeCancelado } = calcularSaldoPrestamo(
    prestamo.monto_inicial,
    pagos
  );

  const config = TIPO_CONFIG[prestamo.tipo as keyof typeof TIPO_CONFIG];
  const Icon = config.icon;

  const nombreDisplay =
    prestamo.tipo === "bancario"
      ? (prestamo.institucion_nombre ?? "Institución")
      : prestamo.personas?.nombre ?? "Persona";

  const esBancario = prestamo.tipo === "bancario";

  async function handleArchivar() {
    if (!confirm("¿Archivar este préstamo? Podés restaurarlo más adelante.")) return;
    try {
      await archivarPrestamo(prestamo.id);
      router.push("/prestamos");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  }

  async function handleCancelar() {
    if (!confirm("¿Marcar este préstamo como cancelado?")) return;
    try {
      await cancelarPrestamo(prestamo.id);
      startTransition(() => router.refresh());
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  }

  async function handleEliminarPago(pago: PrestamoPagoConMovimiento) {
    if (!confirm(`¿Eliminar este pago de ${formatMonto(pago.monto, prestamo.moneda)}? También se eliminará el movimiento vinculado.`)) return;
    setEliminando(true);
    try {
      await eliminarPago(pago.id);
      startTransition(() => router.refresh());
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">

      {/* Nav */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground -ml-2"
          onClick={() => router.push("/prestamos")}
        >
          <ArrowLeft className="h-4 w-4" />
          Préstamos
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border", config.color)}>
              <Icon className="h-3 w-3" />
              {config.label}
            </span>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full border",
              prestamo.estado === "activo"
                ? "bg-emerald-900/40 text-emerald-300 border-emerald-800/60"
                : "bg-surface text-muted-foreground border-border"
            )}>
              {prestamo.estado === "activo" ? "Activo" : "Cancelado"}
            </span>
          </div>
          <h1 className="text-xl font-semibold">
            {prestamo.tipo === "otorgado" ? `Préstamo a ${nombreDisplay}` :
             prestamo.tipo === "recibido" ? `Préstamo de ${nombreDisplay}` :
             nombreDisplay}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Desde {formatFecha(prestamo.fecha_inicio)}
            {prestamo.fecha_vencimiento && ` · Vence ${formatFecha(prestamo.fecha_vencimiento)}`}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => setEditorOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Archivar" onClick={handleArchivar} className="text-muted-foreground">
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Monto inicial</p>
          <p className="text-base font-semibold tabular-nums mt-0.5">
            {formatMonto(prestamo.monto_inicial, prestamo.moneda)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Total pagado</p>
          <p className="text-base font-semibold tabular-nums mt-0.5 text-emerald-400">
            {formatMonto(totalPagado, prestamo.moneda)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <p className={cn("text-base font-semibold tabular-nums mt-0.5", saldoPendiente > 0 ? "text-amber-400" : "text-emerald-400")}>
            {formatMonto(saldoPendiente, prestamo.moneda)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Cancelado</p>
          <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border/40">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${porcentajeCancelado}%` }} />
          </div>
          <p className="text-xs tabular-nums mt-1 font-medium">{porcentajeCancelado}%</p>
        </div>
      </div>

      {/* KPIs bancario */}
      {esBancario && (
        <div className="grid grid-cols-3 gap-3">
          {prestamo.cuota_mensual && (
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Cuota mensual</p>
              <p className="text-sm font-semibold tabular-nums mt-0.5">
                {formatMonto(prestamo.cuota_mensual, prestamo.moneda)}
              </p>
            </div>
          )}
          {prestamo.cantidad_cuotas && (
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Cuotas</p>
              <p className="text-sm font-semibold tabular-nums mt-0.5">
                {pagos.length} / {prestamo.cantidad_cuotas}
              </p>
            </div>
          )}
          {prestamo.cantidad_cuotas && pagos.length < prestamo.cantidad_cuotas && (
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Próxima cuota</p>
              <p className="text-sm font-semibold mt-0.5">
                {calcularProximaFecha(prestamo.fecha_inicio, pagos.length, prestamo.dia_vencimiento_cuota)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Acciones rápidas */}
      {prestamo.estado === "activo" && (
        <div className="flex gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => setRegistrarOpen(true)}>
            <Plus className="h-4 w-4" />
            Registrar pago
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancelar}>
            Marcar cancelado
          </Button>
        </div>
      )}

      {/* Lista de pagos */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">
          Pagos <span className="text-muted-foreground font-normal">({pagos.length})</span>
        </h2>

        {pagos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay pagos registrados todavía.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            {pagos.map((pago, idx) => (
              <div
                key={pago.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  idx < pagos.length - 1 && "border-b border-border"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">
                      {formatMonto(pago.monto, prestamo.moneda)}
                    </span>
                    {pago.cuota_numero && (
                      <span className="text-xs text-muted-foreground bg-surface px-1.5 py-0.5 rounded border border-border">
                        Cuota {pago.cuota_numero}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatFecha(pago.fecha)}
                    {pago.notas && <span> · {pago.notas}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setEditandoPago(pago)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                    onClick={() => handleEliminarPago(pago)}
                    disabled={eliminando}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      <PrestamoEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          startTransition(() => router.refresh());
        }}
        personas={personas}
        editing={prestamo as unknown as Prestamo}
      />

      <RegistrarPagoPrestamoModal
        open={registrarOpen}
        onClose={() => {
          setRegistrarOpen(false);
          startTransition(() => router.refresh());
        }}
        prestamo={prestamo}
        saldoPendiente={saldoPendiente}
        cuotasSiguiente={esBancario ? pagos.length + 1 : undefined}
        cuentas={cuentas}
      />

      {editandoPago && (
        <EditarPagoPrestamoModal
          open={!!editandoPago}
          onClose={() => {
            setEditandoPago(null);
            startTransition(() => router.refresh());
          }}
          pago={editandoPago}
          moneda={prestamo.moneda}
          cuentas={cuentas}
        />
      )}
    </div>
  );
}
