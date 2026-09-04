import type { Movimiento } from "@/types/supabase";

/**
 * Tipo y formateadores del movimiento, compartidos entre la lista y la ventana
 * de detalle. Vivían dentro de `movimientos-client.tsx`; importarlos desde el
 * diálogo habría creado un ciclo, y duplicarlos era garantía de que la lista y
 * el detalle terminaran mostrando el mismo dato distinto.
 */
export type MovimientoConRelaciones = Movimiento & {
  categorias?: { id: string; nombre: string; tipo: string; parent_id: string | null } | null;
  cuentas?: { id: string; nombre: string; tipo: string } | null;
  cuenta_destino?: { id: string; nombre: string } | null;
  tarjetas?: { id: string; nombre: string } | null;
  gastos_compartidos_participantes?: { id: string; estado: string; monto: number; persona_id: string | null }[] | null;
  prestamos?: { id: string; tipo: string; institucion_nombre: string | null; persona_id: string | null; personas?: { nombre: string } | null } | null;
};

export const NECESIDAD_COLORS: Record<number, string> = {
  1: "bg-danger/10 text-danger border-danger/20",
  2: "bg-warning/10 text-warning border-warning/20",
  3: "bg-warning/10 text-warning border-warning/20",
  4: "bg-success/10 text-success border-success/20",
  5: "bg-success/10 text-success border-success/20",
};

export function formatMonto(n: number, moneda = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatFecha(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

/** Fecha larga, para el detalle: "22 de agosto de 2026". */
export function formatFechaLarga(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Muestra el concepto sin el sufijo "(cuota i/N)" (se ve como badge aparte). */
export function conceptoBase(m: { concepto: string | null; descripcion: string | null }) {
  return (m.concepto || m.descripcion || "—").replace(/\s*\(cuota\s*\d+\/\d+\)\s*$/i, "");
}

export function nombrePrestamo(m: MovimientoConRelaciones): string | null {
  if (!m.prestamos) return null;
  const p = m.prestamos;
  if (p.tipo === "bancario") return p.institucion_nombre ?? "Institución";
  const persona = p.personas?.nombre ?? "Persona";
  return p.tipo === "otorgado" ? `Préstamo a ${persona}` : `Préstamo de ${persona}`;
}
