"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NamedSelect } from "@/components/ui/named-select";
import { cn } from "@/lib/utils";
import { calcularCuotaFrancesa } from "@/lib/domain/calcularCuotaFrancesa";
import { createPrestamo, updatePrestamo } from "@/lib/supabase/actions/prestamos";
import type { Persona, Prestamo } from "@/types/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  personas: Persona[];
  editing?: Prestamo | null;
}

type Tipo = "otorgado" | "recibido" | "bancario";

const TIPO_LABELS: Record<Tipo, string> = {
  otorgado: "Otorgado (yo presté)",
  recibido: "Recibido (me prestaron)",
  bancario: "Bancario (institución)",
};

export function PrestamoEditor({ open, onClose, personas, editing }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos del formulario
  const [tipo, setTipo] = useState<Tipo>("otorgado");
  const [personaId, setPersonaId] = useState<string>("");
  const [institucion, setInstitucion] = useState("");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10));
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [cantidadCuotas, setCantidadCuotas] = useState("");
  const [tasaAnual, setTasaAnual] = useState("");
  const [cuotaMensual, setCuotaMensual] = useState("");
  const [diaVencimiento, setDiaVencimiento] = useState("");
  const [notas, setNotas] = useState("");

  // Populate al editar
  useEffect(() => {
    if (editing) {
      setTipo(editing.tipo as Tipo);
      setPersonaId(editing.persona_id ?? "");
      setInstitucion(editing.institucion_nombre ?? "");
      setMonto(String(editing.monto_inicial));
      setMoneda((editing.moneda as "ARS" | "USD") ?? "ARS");
      setFechaInicio(editing.fecha_inicio);
      setFechaVencimiento(editing.fecha_vencimiento ?? "");
      setCantidadCuotas(editing.cantidad_cuotas ? String(editing.cantidad_cuotas) : "");
      setTasaAnual(editing.tasa_interes_anual ? String(editing.tasa_interes_anual) : "");
      setCuotaMensual(editing.cuota_mensual ? String(editing.cuota_mensual) : "");
      setDiaVencimiento(editing.dia_vencimiento_cuota ? String(editing.dia_vencimiento_cuota) : "");
      setNotas(editing.notas ?? "");
    } else {
      setTipo("otorgado");
      setPersonaId("");
      setInstitucion("");
      setMonto("");
      setMoneda("ARS");
      setFechaInicio(new Date().toISOString().slice(0, 10));
      setFechaVencimiento("");
      setCantidadCuotas("");
      setTasaAnual("");
      setCuotaMensual("");
      setDiaVencimiento("");
      setNotas("");
    }
    setError(null);
  }, [editing, open]);

  function handleCalcularCuota() {
    const m = parseFloat(monto);
    const c = parseInt(cantidadCuotas);
    const t = parseFloat(tasaAnual);
    if (!m || !c || isNaN(t)) return;
    const cuota = calcularCuotaFrancesa(m, c, isNaN(t) ? 0 : t);
    setCuotaMensual(cuota.toFixed(2));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) { setError("El monto debe ser mayor a 0"); return; }
    if (tipo !== "bancario" && !personaId) { setError("Seleccioná una persona"); return; }
    if (tipo === "bancario" && !institucion.trim()) { setError("Ingresá el nombre de la institución"); return; }

    setSubmitting(true);
    try {
      const payload = {
        tipo,
        persona_id: tipo !== "bancario" ? personaId || null : null,
        institucion_nombre: tipo === "bancario" ? institucion.trim() : null,
        monto_inicial: montoNum,
        moneda,
        fecha_inicio: fechaInicio,
        fecha_vencimiento: fechaVencimiento || null,
        cantidad_cuotas: cantidadCuotas ? parseInt(cantidadCuotas) : null,
        tasa_interes_anual: tasaAnual ? parseFloat(tasaAnual) : null,
        cuota_mensual: cuotaMensual ? parseFloat(cuotaMensual) : null,
        dia_vencimiento_cuota: diaVencimiento ? parseInt(diaVencimiento) : null,
        estado: (editing?.estado ?? "activo") as "activo" | "cancelado",
        notas: notas.trim() || null,
      };

      if (editing) {
        await updatePrestamo(editing.id, payload);
      } else {
        const nuevo = await createPrestamo(payload);
        router.push(`/prestamos/${nuevo.id}`);
        return;
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const esBancario = tipo === "bancario";
  const esPersonal = tipo === "otorgado" || tipo === "recibido";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        <div className="p-6 space-y-5">
          <h2 className="text-lg font-semibold">{editing ? "Editar préstamo" : "Nuevo préstamo"}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {(["otorgado", "recibido", "bancario"] as Tipo[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={cn(
                      "py-2 px-3 rounded-md border text-xs font-medium transition-colors",
                      tipo === t
                        ? "bg-primary/10 border-primary/50 text-primary"
                        : "border-border text-muted-foreground hover:bg-surface"
                    )}
                  >
                    {TIPO_LABELS[t].split(" (")[0]}
                    <span className="block font-normal opacity-70 mt-0.5">
                      {TIPO_LABELS[t].match(/\((.+)\)/)?.[1]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Persona (solo personal) */}
            {esPersonal && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Persona</label>
                <NamedSelect
                  options={personas.map((p) => ({ value: p.id, label: p.nombre }))}
                  value={personaId}
                  onValueChange={(v) => setPersonaId(v ?? "")}
                  placeholder="Seleccioná una persona…"
                  className="w-full"
                />
              </div>
            )}

            {/* Institución (solo bancario) */}
            {esBancario && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Institución</label>
                <Input
                  value={institucion}
                  onChange={(e) => setInstitucion(e.target.value)}
                  placeholder="Ej. Banco Nación, Naranja X…"
                />
              </div>
            )}

            {/* Monto + Moneda */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Monto inicial</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Moneda</label>
                <NamedSelect
                  options={[{ value: "ARS", label: "ARS" }, { value: "USD", label: "USD" }]}
                  value={moneda}
                  onValueChange={(v) => setMoneda((v as "ARS" | "USD") ?? "ARS")}
                  className="w-full"
                />
              </div>
            </div>

            {/* Fecha inicio */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha de inicio</label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            {/* Vencimiento (personal: opcional, bancario: oculto) */}
            {esPersonal && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Vencimiento <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <Input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                />
              </div>
            )}

            {/* Cuotas, tasa, cuota mensual (bancario) */}
            {esBancario && (
              <div className="space-y-3 rounded-lg border border-border p-3 bg-surface/40">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Configuración de cuotas</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Cantidad de cuotas</label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={cantidadCuotas}
                      onChange={(e) => setCantidadCuotas(e.target.value)}
                      placeholder="Ej. 24"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Tasa anual (%)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tasaAnual}
                      onChange={(e) => setTasaAnual(e.target.value)}
                      placeholder="Ej. 60"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Cuota mensual</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={handleCalcularCuota}
                      disabled={!monto || !cantidadCuotas}
                    >
                      Calcular (francés)
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cuotaMensual}
                    onChange={(e) => setCuotaMensual(e.target.value)}
                    placeholder="O ingresá el valor del banco"
                  />
                  <p className="text-xs text-muted-foreground">
                    Podés ingresar el valor exacto del banco, o calcular con sistema francés.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Día de vencimiento de cuota</label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    value={diaVencimiento}
                    onChange={(e) => setDiaVencimiento(e.target.value)}
                    placeholder="Ej. 10"
                  />
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <Input
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. Acordado el 15 de abril…"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Acciones */}
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando…" : editing ? "Guardar cambios" : "Crear préstamo"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
