"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createMovimiento } from "@/lib/supabase/actions/movimientos";
import { MovimientoEditor } from "@/app/(app)/movimientos/_components/movimiento-editor";
import type { ParsedMovimiento } from "@/lib/ai/prompts/interpretMovement";
import type { Cuenta, Tarjeta, Categoria, Persona } from "@/types/supabase";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";

interface Props {
  open: boolean;
  onClose: () => void;
  parsed: ParsedMovimiento | null;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  clientes: { id: string; nombre: string }[];
  personas: Persona[];
  grupos: GrupoConMiembros[];
  onConfirmed: () => void;
}

const CONFIANZA_STYLES: Record<string, string> = {
  alta:  "bg-green-900/50 text-green-300 border-green-800",
  media: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
  baja:  "bg-red-900/50 text-red-300 border-red-800",
};

// ── Cuenta inferida ───────────────────────────────────────────────────────────

function inferirCuentaId(
  metodo: string | undefined,
  cuentaIdDeClaude: string | null | undefined,
  cuentas: Cuenta[],
): string | undefined {
  if (cuentaIdDeClaude) return cuentaIdDeClaude;
  if (!metodo) return undefined;
  const activasTipo = (tipo: string) => cuentas.filter((c) => c.tipo === tipo && !c.archivada);
  if (metodo === "Efectivo") {
    const e = activasTipo("Efectivo");
    return e.length === 1 ? e[0].id : undefined;
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

// Resuelve tarjeta_id: usa el que Claude devolvió, o busca por nombre
function inferirTarjetaId(
  parsed: ParsedMovimiento,
  tarjetas: Tarjeta[],
): string | undefined {
  if (parsed.tarjeta_id) return parsed.tarjeta_id;
  if (!parsed.tarjeta) return undefined;
  return tarjetas.find(
    (t) => t.nombre.toLowerCase() === parsed.tarjeta.toLowerCase()
  )?.id;
}

// ── Valores para el editor ────────────────────────────────────────────────────

function parsedToEditorDefaults(
  p: ParsedMovimiento,
  categorias: Categoria[],
  cuentas: Cuenta[],
  tarjetas: Tarjeta[],
): Record<string, unknown> {
  // categoria_id para el editor: prefer subcategoria_id (editor resolverá padre+subcat)
  // fallback: categoria_id, luego búsqueda por nombre
  const cat_id =
    p.subcategoria_id ??
    p.categoria_id ??
    categorias.find(
      (c) =>
        c.nombre.toLowerCase() === p.concepto?.toLowerCase() ||
        c.nombre.toLowerCase() === p.categoria?.toLowerCase()
    )?.id;

  const cuenta_id = inferirCuentaId(p.metodo, p.cuentaId, cuentas);
  const tarjeta_id = inferirTarjetaId(p, tarjetas);

  return {
    tipo:              p.tipo,
    ambito:            p.ambito ?? "Personal",
    cliente_id:        p.cliente_id ?? null,
    servicio_id:       p.servicio_id ?? null,
    moneda:            p.moneda,
    tipo_cambio:       p.tipoCambio ?? undefined,
    monto:             p.final,
    categoria_id:      cat_id ?? undefined,
    clasificacion:     p.clasificacion,
    cuotas:            p.cuotas,
    frecuencia:        p.frecuencia,
    necesidad:         p.necesidad ?? undefined,
    metodo:            p.metodo as Parameters<typeof createMovimiento>[0]["metodo"],
    cuenta_id,
    tarjeta_id,
    concepto:          p.concepto,
    descripcion:       p.descripcion,
    cantidad:          p.cantidad,
    fecha:             p.fechaConsumo,
    fecha_vencimiento: p.fechaVencimiento ?? undefined,
    debita_de:         p.debitaDe as "cuenta" | "tarjeta" | undefined,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RevisionModal({
  open,
  onClose,
  parsed,
  cuentas,
  tarjetas,
  categorias,
  clientes,
  personas,
  grupos,
  onConfirmed,
}: Props) {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !parsed) return null;

  // Lookups for display
  const cuentaId   = inferirCuentaId(parsed.metodo, parsed.cuentaId, cuentas);
  const cuentaNombre = cuentas.find((c) => c.id === cuentaId)?.nombre;
  const tarjetaId  = inferirTarjetaId(parsed, tarjetas);
  const tarjetaNombre = tarjetas.find((t) => t.id === tarjetaId)?.nombre || parsed.tarjeta || undefined;

  // Category display: look up parent name from categoria_id
  const catPadreName =
    parsed.categoria_id
      ? (categorias.find((c) => c.id === parsed.categoria_id)?.nombre ?? parsed.categoria)
      : parsed.categoria || undefined;
  const catHijaNombre =
    parsed.subcategoria_id
      ? categorias.find((c) => c.id === parsed.subcategoria_id)?.nombre
      : undefined;

  // Whether categoria needs to be created (Claude couldn't find an ID)
  const catNeedCreate = !parsed.categoria_id && !!parsed.categoria;
  const subNeedCreate = parsed.categoria_id && !parsed.subcategoria_id && !!parsed.concepto
    && parsed.concepto.toLowerCase() !== parsed.categoria?.toLowerCase();

  const showTarjeta = parsed.metodo === "Crédito" ||
    (parsed.metodo === "Débito automático" && parsed.debitaDe === "tarjeta");
  const showCuotas = parsed.cuotas > 1;

  async function handleConfirmar() {
    if (!parsed) return;
    setIsConfirming(true);
    setError(null);
    try {
      await createMovimiento({
        tipo:              parsed.tipo,
        ambito:            parsed.ambito ?? "Personal",
        cliente_id:        parsed.cliente_id ?? null,
        servicio_id:       parsed.servicio_id ?? null,
        monto:             parsed.final,
        moneda:            parsed.moneda,
        tipo_cambio:       parsed.tipoCambio ?? null,
        concepto:          parsed.concepto,
        descripcion:       parsed.descripcion,
        clasificacion:     parsed.clasificacion,
        cuotas:            parsed.cuotas,
        frecuencia:        parsed.frecuencia,
        necesidad:         parsed.necesidad ?? null,
        metodo:            parsed.metodo as Parameters<typeof createMovimiento>[0]["metodo"],
        cuenta_id:         cuentaId ?? null,
        tarjeta_id:        tarjetaId ?? null,
        categoria_id:      parsed.subcategoria_id ?? parsed.categoria_id ?? null,
        fecha:             parsed.fechaConsumo,
        fecha_vencimiento: parsed.fechaVencimiento ?? null,
        debita_de:         (parsed.debitaDe ?? null) as "cuenta" | "tarjeta" | null,
        cantidad:          parsed.cantidad,
        unitario:          parsed.unitario,
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

  // suggestCategoria: if Claude didn't find an ID, pre-fill the create input
  const suggestCategoria = catNeedCreate ? (parsed.categoria ?? undefined) : undefined;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 sm:items-center sm:pt-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />

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
          <div className="px-5 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
            {/* Badge de confianza */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium",
                CONFIANZA_STYLES[parsed.confianza]
              )}>
                Confianza {parsed.confianza}
              </span>
            </div>

            {/* Resumen completo */}
            <div className="bg-surface rounded-lg p-4 space-y-2 text-sm">
              <Row label="Tipo"          value={parsed.tipo}       accent={parsed.tipo === "Ingreso" ? "green" : "red"} />
              <Row label="Ámbito"        value={parsed.ambito ?? "Personal"} />
              {parsed.cliente_id && <Row label="Cliente" value={clientes.find((c) => c.id === parsed.cliente_id)?.nombre ?? parsed.cliente_id} />}
              <Row label="Concepto"      value={parsed.concepto} />
              {parsed.descripcion && <Row label="Descripción" value={parsed.descripcion} />}

              {/* Categoría */}
              {catNeedCreate ? (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Categoría</span>
                  <span className="font-medium text-right text-primary text-xs">
                    Crear: &quot;{parsed.categoria}&quot;
                  </span>
                </div>
              ) : (
                <Row label="Categoría" value={catPadreName} />
              )}

              {/* Subcategoría */}
              {catHijaNombre ? (
                <Row label="Subcategoría" value={catHijaNombre} />
              ) : subNeedCreate ? (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Subcategoría</span>
                  <span className="font-medium text-right text-primary text-xs">
                    Crear: &quot;{parsed.concepto}&quot;
                  </span>
                </div>
              ) : null}

              <Row label="Monto"     value={`${parsed.moneda} ${parsed.final.toLocaleString("es-AR")}`} />
              {parsed.moneda === "USD" && parsed.tipoCambio && (
                <Row label="Tipo de cambio" value={`$${parsed.tipoCambio.toLocaleString("es-AR")}`} />
              )}
              {showCuotas && (
                <Row
                  label="Cuotas"
                  value={`${parsed.cuotas} × ${parsed.moneda} ${parsed.unitario.toLocaleString("es-AR")}`}
                />
              )}
              <Row label="Fecha"         value={parsed.fechaConsumo} />
              <Row label="Método"        value={parsed.metodo} />
              {showTarjeta && <Row label="Tarjeta"  value={tarjetaNombre ?? "(no inferida)"} muted={!tarjetaNombre} />}
              {parsed.debitaDe && <Row label="Débita de" value={parsed.debitaDe} />}
              {cuentaNombre  && <Row label="Cuenta"   value={cuentaNombre} />}
              {parsed.fechaVencimiento && <Row label="Vencimiento" value={parsed.fechaVencimiento} />}
              {parsed.necesidad !== null && <Row label="Necesidad" value={`${parsed.necesidad}/5`} />}
              <Row label="Clasificación" value={parsed.clasificacion} />
              <Row label="Frecuencia"    value={parsed.frecuencia} />
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
            <Button variant="ghost" size="sm" onClick={() => setEditorOpen(true)}>
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

      {editorOpen && (
        <MovimientoEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            onConfirmed();
          }}
          editing={null}
          cuentas={cuentas}
          tarjetas={tarjetas}
          categorias={categorias}
          clientes={clientes}
          personas={personas}
          grupos={grupos}
          defaultValues={
            parsedToEditorDefaults(parsed, categorias, cuentas, tarjetas) as
              Parameters<typeof MovimientoEditor>[0]["defaultValues"]
          }
          suggestCategoria={suggestCategoria}
        />
      )}
    </>
  );
}

// ── Row helper ────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string | number | null | undefined;
  accent?: "green" | "red";
  muted?: boolean;
}) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        "font-medium text-right",
        accent === "green" && "text-green-400",
        accent === "red"   && "text-red-400",
        muted              && "text-muted-foreground",
      )}>
        {String(value)}
      </span>
    </div>
  );
}
