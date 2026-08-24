"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NamedSelect } from "@/components/ui/named-select";
import { cn } from "@/lib/utils";
import { setPresupuesto, copiarDelMesAnterior } from "@/lib/supabase/actions/presupuestos";

interface Props {
  anioMes: string;
  categorias: { id: string; nombre: string }[];
  presupuestoPorCat: Record<string, number>;
  gastadoPorCat: Record<string, number>;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function meses() {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -1; i < 11; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
    });
  }
  return out;
}

export function PresupuestosClient({ anioMes, categorias, presupuestoPorCat, gastadoPorCat }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(
    () => Object.fromEntries(categorias.map((c) => [c.id, presupuestoPorCat[c.id] ? String(presupuestoPorCat[c.id]) : ""])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiando, setCopiando] = useState(false);

  function cambiarMes(v: string | null) {
    if (!v) return;
    const url = new URL(window.location.href);
    url.searchParams.set("mes", v);
    router.push(url.toString());
  }

  async function guardar(categoriaId: string) {
    const monto = parseFloat(valores[categoriaId] ?? "") || 0;
    if (monto === (presupuestoPorCat[categoriaId] ?? 0)) return; // sin cambios
    setSavingId(categoriaId);
    try {
      await setPresupuesto({ categoriaId, anioMes, monto });
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  async function handleCopiar() {
    setCopiando(true);
    try {
      await copiarDelMesAnterior(anioMes);
      router.refresh();
    } finally {
      setCopiando(false);
    }
  }

  const totalPresu = Object.values(presupuestoPorCat).reduce((a, b) => a + b, 0);
  const totalGastado = categorias.reduce((a, c) => a + (gastadoPorCat[c.id] ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Presupuestos</h1>
          <p className="text-sm text-muted-foreground mt-1">Objetivo de gasto por categoría (ARS).</p>
        </div>
        <div className="flex items-center gap-2">
          <NamedSelect options={meses()} value={anioMes} onValueChange={cambiarMes} className="h-8 w-40 text-sm" />
          <Button size="sm" variant="outline" onClick={handleCopiar} disabled={copiando}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar mes anterior
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Presupuesto total</p>
          <p className="text-lg font-bold tabular-nums font-mono mt-0.5">{fmt(totalPresu)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Gastado</p>
          <p className={cn("text-lg font-bold tabular-nums font-mono mt-0.5", totalGastado > totalPresu && totalPresu > 0 ? "text-danger" : "text-foreground")}>{fmt(totalGastado)}</p>
        </div>
      </div>

      {categorias.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
          No tenés categorías de egreso. Creá algunas en Categorías.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {categorias.map((c) => {
            const presu = parseFloat(valores[c.id] ?? "") || 0;
            const gastado = gastadoPorCat[c.id] ?? 0;
            const pct = presu > 0 ? Math.min(100, Math.round((gastado / presu) * 100)) : 0;
            const excedido = presu > 0 && gastado > presu;
            return (
              <div key={c.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium min-w-0 truncate">{c.nombre}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground tabular-nums font-mono">{fmt(gastado)} /</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="h-8 w-28 text-sm text-right"
                      value={valores[c.id] ?? ""}
                      onChange={(e) => setValores((v) => ({ ...v, [c.id]: e.target.value }))}
                      onBlur={() => guardar(c.id)}
                      disabled={savingId === c.id}
                    />
                  </div>
                </div>
                {presu > 0 && (
                  <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border/40">
                    <div className={cn("h-full rounded-full transition-all", excedido ? "bg-danger" : "bg-success")} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">El presupuesto se guarda al salir del campo. Poné 0 para quitarlo.</p>
    </div>
  );
}
