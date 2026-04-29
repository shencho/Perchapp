"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createMovimiento } from "@/lib/supabase/actions/movimientos";
import { MovimientoEditor } from "@/app/(app)/movimientos/_components/movimiento-editor";
import type { ParsedMovimiento } from "@/lib/ai/prompts/interpretMovement";
import type { Cuenta, Tarjeta, Categoria } from "@/types/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  parsed: ParsedMovimiento | null;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  onConfirmed: () => void;
}

const CONFIANZA_STYLES: Record<string, string> = {
  alta:  "bg-green-900/50 text-green-300 border-green-800",
  media: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
  baja:  "bg-red-900/50 text-red-300 border-red-800",
};

// Infiere la cuenta más obvia según el método de pago.
// Si Claude ya devolvió un cuentaId, ese tiene prioridad.
function inferirCuentaId(
  metodo: string | undefined,
  cuentaIdDeClaude: string | null | undefined,
  cuentas: Cuenta[],
): string | undefined {
  if (cuentaIdDeClaude) return cuentaIdDeClaude;
  if (!metodo) return undefined;

  const activasTipo = (tipo: string) => cuentas.filter((c) => c.tipo === tipo && !c.archivada);

  if (metodo === "Efectivo") {
    const efectivo = activasTipo("Efectivo");
    return efectivo.length === 1 ? efectivo[0].id : undefined;
  }
  if (metodo === "Billetera virtual") {
    const bv = activasTipo("Billetera virtual");
    return bv.length === 1 ? bv[0].id : undefined;
  }
  if (metodo === "Transferencia" || metodo === "Débito") {
    const banco = activasTipo("Banco");
    return banco.length === 1 ? banco[0].id : undefined;
  }
  return undefined;
}

// Mapea campos del intérprete al formato del editor
function parsedToEditorDefaults(
  p: ParsedMovimiento,
  categorias: Categoria[],
  cuentas: Cuenta[],
): Record<string, unknown> {
  // Buscar categoria_id por nombre (concepto o categoría)
  const catMatch = categorias.find(
    (c) => c.nombre.toLowerCase() === p.concepto?.toLowerCase() ||
           c.nombre.toLowerCase() === p.categoria?.toLowerCase()
  );

  const cuenta_id = inferirCuentaId(p.metodo, p.cuentaId, cuentas);

  return {
    tipo:          p.tipo,
    ambito:        "Personal",
    moneda:        p.moneda,
    tipo_cambio:   p.tipoCambio ?? undefined,
    monto:         p.final,
    categoria_id:  catMatch?.id ?? undefined,
    clasificacion: p.clasificacion,
    cuotas:        p.cuotas,
    frecuencia:    p.frecuencia,
    necesidad:     p.necesidad ?? undefined,
    metodo:        p.metodo as Parameters<typeof createMovimiento>[0]["metodo"],
    cuenta_id,
    concepto:      p.concepto,
    descripcion:   p.descripcion,
    cantidad:      p.cantidad,
    fecha:         p.fechaConsumo,
    fecha_vencimiento: p.fechaVencimiento ?? undefined,
    debita_de:     p.debitaDe as "cuenta" | "tarjeta" | undefined,
  };
}

export function RevisionModal({ open, onClose, parsed, cuentas, tarjetas, categorias, onConfirmed }: Props) {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !parsed) return null;

  async function handleConfirmar() {
    if (!parsed) return;
    setIsConfirming(true);
    setError(null);
    try {
      await createMovimiento({
        tipo:             parsed.tipo,
        ambito:           "Personal",
        monto:            parsed.final,
        moneda:           parsed.moneda,
        tipo_cambio:      parsed.tipoCambio ?? null,
        concepto:         parsed.concepto,
        descripcion:      parsed.descripcion,
        clasificacion:    parsed.clasificacion,
        cuotas:           parsed.cuotas,
        frecuencia:       parsed.frecuencia,
        necesidad:        parsed.necesidad ?? null,
        metodo:           parsed.metodo as Parameters<typeof createMovimiento>[0]["metodo"],
        cuenta_id:        inferirCuentaId(parsed.metodo, parsed.cuentaId, cuentas) ?? null,
        fecha:            parsed.fechaConsumo,
        fecha_vencimiento: parsed.fechaVencimiento ?? null,
        debita_de:        (parsed.debitaDe ?? null) as "cuenta" | "tarjeta" | null,
        cantidad:         parsed.cantidad,
        unitario:         parsed.unitario,
      });
      router.refresh();
      onConfirmed();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 sm:items-center sm:pt-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />

        {/* Panel */}
        <div className="relative z-10 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <h2 className="font-semibold text-base">¿Esto es lo que querías registrar?</h2>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Contenido */}
          <div className="px-5 py-4 space-y-3">
            {/* Badge de confianza */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium",
                CONFIANZA_STYLES[parsed.confianza]
              )}>
                Confianza {parsed.confianza}
              </span>
            </div>

            {/* Resumen */}
            <div className="bg-surface rounded-lg p-4 space-y-2 text-sm">
              <Row label="Tipo" value={parsed.tipo} accent={parsed.tipo === "Ingreso" ? "green" : "red"} />
              <Row label="Concepto" value={parsed.concepto} />
              {parsed.descripcion && <Row label="Descripción" value={parsed.descripcion} />}
              <Row label="Categoría" value={parsed.categoria} />
              <Row label="Monto" value={`${parsed.moneda} ${parsed.final.toLocaleString("es-AR")}`} />
              {parsed.cuotas > 1 && (
                <Row label="Cuotas" value={`${parsed.cuotas} cuotas de ${parsed.moneda} ${parsed.unitario.toLocaleString("es-AR")}`} />
              )}
              <Row label="Fecha" value={parsed.fechaConsumo} />
              <Row label="Método" value={parsed.metodo} />
              {parsed.fechaVencimiento && <Row label="Vencimiento" value={parsed.fechaVencimiento} />}
              {parsed.necesidad !== null && (
                <Row label="Necesidad" value={`${parsed.necesidad}/5`} />
              )}
              <Row label="Clasificación" value={parsed.clasificacion} />
              <Row label="Frecuencia" value={parsed.frecuencia} />
            </div>

            {/* Notas del intérprete */}
            {parsed.notas && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
                {parsed.notas}
              </p>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditorOpen(true)}
            >
              Editar antes de confirmar
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isConfirming}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleConfirmar} disabled={isConfirming}>
                {isConfirming ? "Creando…" : "Confirmar y crear"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor de edición previa (pre-rellenado con lo que entendió Claude) */}
      {editorOpen && parsed && (
        <MovimientoEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          editing={null}
          cuentas={cuentas}
          tarjetas={tarjetas}
          categorias={categorias}
          defaultValues={parsedToEditorDefaults(parsed, categorias, cuentas) as Parameters<typeof MovimientoEditor>[0]["defaultValues"]}
          suggestCategoria={
            !categorias.find((c) => !c.parent_id && c.nombre.toLowerCase() === parsed.categoria?.toLowerCase())
              ? (parsed.categoria ?? undefined)
              : undefined
          }
        />
      )}
    </>
  );
}

function Row({ label, value, accent }: { label: string; value: string | number | null | undefined; accent?: "green" | "red" }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        "font-medium text-right",
        accent === "green" && "text-green-400",
        accent === "red" && "text-red-400",
      )}>
        {String(value)}
      </span>
    </div>
  );
}
