"use client";

import { Pencil } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NECESIDAD_COLORS, conceptoBase, formatFechaLarga, formatMonto, nombrePrestamo,
  type MovimientoConRelaciones,
} from "./movimiento-format";

interface Props {
  movimiento: MovimientoConRelaciones | null;
  onClose: () => void;
  onEditar: (m: MovimientoConRelaciones) => void;
}

/** Una fila del detalle. No se renderiza si no hay dato: menos ruido que "—". */
function Dato({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right min-w-0 break-words">{children}</span>
    </div>
  );
}

/**
 * Detalle de solo lectura.
 *
 * Antes la única forma de ver los datos de un movimiento era abrir el
 * formulario de edición, que muestra controles en vez de información y arriesga
 * que se guarde un cambio sin querer.
 *
 * No hace ninguna consulta: la fila que ya tiene la lista trae todas las
 * columnas y las relaciones resueltas.
 */
export function MovimientoDetalleDialog({ movimiento, onClose, onEditar }: Props) {
  const m = movimiento;
  if (!m) return null;

  const esCuota = m.cuota_numero != null && (m.cuotas ?? 0) > 1;
  const categoria = m.categorias?.nombre ?? null;
  const prestamo = nombrePrestamo(m);
  const compartidos = m.gastos_compartidos_participantes ?? [];

  const signo = m.tipo === "Ingreso" ? "+" : m.tipo === "Egreso" ? "−" : "";
  const colorMonto =
    m.tipo === "Ingreso" ? "text-success" : m.tipo === "Egreso" ? "text-danger" : "text-foreground";

  return (
    <Dialog open={Boolean(m)} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6">{conceptoBase(m)}</DialogTitle>
        </DialogHeader>

        <div>
          <p className={cn("font-mono font-semibold tabular-nums", colorMonto)} style={{ fontSize: 30 }}>
            {signo} {formatMonto(m.monto, m.moneda)}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">{formatFechaLarga(m.fecha)}</p>
        </div>

        <div className="mt-1">
          <Dato label="Tipo">{m.tipo}</Dato>
          <Dato label="Categoría">{categoria}</Dato>
          <Dato label="Método">{m.metodo}</Dato>
          <Dato label="Cuenta">{m.cuentas?.nombre}</Dato>
          <Dato label="Cuenta destino">{m.cuenta_destino?.nombre}</Dato>
          <Dato label="Tarjeta">{m.tarjetas?.nombre}</Dato>
          <Dato label="Préstamo">{prestamo}</Dato>

          <Dato label="Clasificación">{m.clasificacion}</Dato>
          <Dato label="Frecuencia">{m.frecuencia}</Dato>
          <Dato label="Cuota">
            {esCuota ? `${m.cuota_numero} de ${m.cuotas}` : null}
          </Dato>
          <Dato label="Fecha de compra">
            {m.fecha_compra ? formatFechaLarga(m.fecha_compra) : null}
          </Dato>
          <Dato label="Vencimiento">
            {m.fecha_vencimiento ? formatFechaLarga(m.fecha_vencimiento) : null}
          </Dato>

          <Dato label="Necesidad">
            {m.necesidad ? (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-[var(--radius-chip)] border",
                NECESIDAD_COLORS[m.necesidad],
              )}>
                Nivel {m.necesidad}
              </span>
            ) : null}
          </Dato>

          {/* Cross-moneda: sin esto el detalle miente sobre cuánto entró. */}
          {/* En una transferencia cross-moneda la cuenta destino es, por
              definición, la otra moneda; el embed sólo trae id y nombre. */}
          <Dato label="Monto acreditado">
            {m.monto_destino
              ? formatMonto(m.monto_destino, m.moneda === "ARS" ? "USD" : "ARS")
              : null}
          </Dato>
          <Dato label="Tipo de cambio">
            {m.tipo_cambio ? `$ ${m.tipo_cambio.toFixed(2)} por USD` : null}
          </Dato>

          <Dato label="Cantidad">{(m.cantidad ?? 1) > 1 ? m.cantidad : null}</Dato>
          <Dato label="Es reembolso">{m.es_reembolso ? "Sí" : null}</Dato>

          <Dato label="Gasto compartido">
            {m.es_compartido
              ? `Tu parte: ${formatMonto(m.gc_mi_parte ?? m.monto, m.moneda)}${
                  compartidos.length ? ` · ${compartidos.length} participante${compartidos.length === 1 ? "" : "s"}` : ""
                }`
              : null}
          </Dato>

          <Dato label="Descripción">{m.descripcion}</Dato>
          <Dato label="Observaciones">{m.observaciones}</Dato>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={() => onEditar(m)}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
