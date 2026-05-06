"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TEMPLATE_CATEGORIAS } from "@/lib/templates/catalogos";
import { aplicarTemplate } from "@/lib/supabase/actions/categorias";
import type { Categoria } from "@/types/supabase";
import { CheckCircle2, Loader2 } from "lucide-react";

type Estrategia = "saltar" | "reemplazar" | "crear_duplicado";

interface BuiltItem {
  categoria_nombre: string;
  tipo: "Egreso" | "Ingreso";
  subcategoria_nombre?: string;
  nombre_personalizado?: string;
  estrategia_conflicto: Estrategia;
}

interface ConflictRow {
  itemIdx: number;
  label: string;
  estrategia: Estrategia;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: Categoria[];
  onDone: () => void;
}

const pk = (i: number) => `p:${i}`;
const sk = (i: number, si: number) => `s:${i}:${si}`;

export function ImportarTemplateModal({ open, onOpenChange, categorias, onDone }: Props) {
  const [tab, setTab] = useState<"Egreso" | "Ingreso">("Egreso");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"select" | "conflicts" | "done">("select");
  const [conflictRows, setConflictRows] = useState<ConflictRow[]>([]);
  const [builtItems, setBuiltItems] = useState<BuiltItem[]>([]);
  const [results, setResults] = useState<{ creadas: number; saltadas: number; reemplazadas: number; errores: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const checkboxRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Update indeterminate visual state on every checked change
  useEffect(() => {
    TEMPLATE_CATEGORIAS.forEach((cat, idx) => {
      if (cat.subcategorias.length === 0) return;
      const el = checkboxRefs.current[pk(idx)];
      if (!el) return;
      const all = cat.subcategorias.every((_, si) => !!checked[sk(idx, si)]);
      const some = cat.subcategorias.some((_, si) => !!checked[sk(idx, si)]);
      el.indeterminate = some && !all;
    });
  }, [checked]);

  function allSubsChecked(idx: number) {
    const subs = TEMPLATE_CATEGORIAS[idx].subcategorias;
    return subs.length > 0 && subs.every((_, si) => !!checked[sk(idx, si)]);
  }

  function toggleParent(idx: number) {
    const cat = TEMPLATE_CATEGORIAS[idx];
    if (cat.subcategorias.length === 0) {
      setChecked(prev => ({ ...prev, [pk(idx)]: !prev[pk(idx)] }));
      return;
    }
    const toCheck = !allSubsChecked(idx);
    setChecked(prev => {
      const next = { ...prev };
      cat.subcategorias.forEach((_, si) => { next[sk(idx, si)] = toCheck; });
      return next;
    });
  }

  function toggleSub(idx: number, si: number) {
    setChecked(prev => ({ ...prev, [sk(idx, si)]: !prev[sk(idx, si)] }));
  }

  function buildItems(): BuiltItem[] {
    const items: BuiltItem[] = [];
    TEMPLATE_CATEGORIAS.forEach((cat, idx) => {
      if (cat.subcategorias.length === 0) {
        if (checked[pk(idx)]) {
          items.push({ categoria_nombre: cat.nombre, tipo: cat.tipo, estrategia_conflicto: "saltar" });
        }
      } else {
        cat.subcategorias.forEach((sub, si) => {
          if (!checked[sk(idx, si)]) return;
          const nombreCustom = sub.personalizable ? nombres[sk(idx, si)]?.trim() : undefined;
          items.push({
            categoria_nombre: cat.nombre,
            tipo: cat.tipo,
            subcategoria_nombre: sub.nombre,
            nombre_personalizado: nombreCustom || undefined,
            estrategia_conflicto: "saltar",
          });
        });
      }
    });
    return items;
  }

  function detectConflicts(items: BuiltItem[]): number[] {
    const active = categorias.filter(c => !c.archivada);
    return items.reduce<number[]>((acc, item, idx) => {
      const parentMatch = active.find(
        c => !c.parent_id && c.nombre.toLowerCase() === item.categoria_nombre.toLowerCase()
      );
      if (!item.subcategoria_nombre) {
        if (parentMatch) acc.push(idx);
      } else if (parentMatch) {
        const subNombre = item.nombre_personalizado?.trim() || item.subcategoria_nombre;
        const subMatch = active.find(
          c => c.parent_id === parentMatch.id && c.nombre.toLowerCase() === subNombre.toLowerCase()
        );
        if (subMatch) acc.push(idx);
      }
      return acc;
    }, []);
  }

  function itemLabel(item: BuiltItem): string {
    if (item.subcategoria_nombre) {
      return `${item.categoria_nombre} › ${item.nombre_personalizado?.trim() || item.subcategoria_nombre}`;
    }
    return item.categoria_nombre;
  }

  async function doImport(items: BuiltItem[]) {
    setLoading(true);
    try {
      const result = await aplicarTemplate({ items });
      setResults(result);
      setStep("done");
    } finally {
      setLoading(false);
    }
  }

  async function handleImportar() {
    const items = buildItems();
    if (items.length === 0) return;
    const conflictIdxs = detectConflicts(items);
    setBuiltItems(items);
    if (conflictIdxs.length === 0) {
      await doImport(items);
    } else {
      setConflictRows(conflictIdxs.map(idx => ({
        itemIdx: idx,
        label: itemLabel(items[idx]),
        estrategia: "saltar" as Estrategia,
      })));
      setStep("conflicts");
    }
  }

  async function handleConfirmar() {
    const finalItems = builtItems.map((item, idx) => {
      const conflict = conflictRows.find(r => r.itemIdx === idx);
      return conflict ? { ...item, estrategia_conflicto: conflict.estrategia } : item;
    });
    await doImport(finalItems);
  }

  function handleClose() {
    if (step === "done") onDone();
    onOpenChange(false);
    setStep("select");
    setChecked({});
    setNombres({});
    setConflictRows([]);
    setBuiltItems([]);
    setResults(null);
    setLoading(false);
  }

  const hasSelection = TEMPLATE_CATEGORIAS.some((cat, idx) => {
    if (cat.subcategorias.length === 0) return !!checked[pk(idx)];
    return cat.subcategorias.some((_, si) => !!checked[sk(idx, si)]);
  });

  const filteredCats = TEMPLATE_CATEGORIAS
    .map((cat, idx) => ({ cat, idx }))
    .filter(({ cat }) => cat.tipo === tab);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg flex flex-col gap-0 p-0 overflow-hidden max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Importar categorías sugeridas</DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <>
            <div className="flex gap-0 border-b border-border px-6 shrink-0">
              {(["Egreso", "Ingreso"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                    tab === t
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "Egreso" ? "Egresos" : "Ingresos"}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto flex-1 flex flex-col px-6 py-3 min-h-0">
              {filteredCats.map(({ cat, idx }) => {
                const hasSubs = cat.subcategorias.length > 0;
                const allChk = allSubsChecked(idx);

                return (
                  <div key={idx}>
                    <label className="flex items-center gap-3 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        ref={el => { checkboxRefs.current[pk(idx)] = el; }}
                        checked={hasSubs ? allChk : !!checked[pk(idx)]}
                        onChange={() => toggleParent(idx)}
                        className="h-4 w-4 rounded shrink-0"
                      />
                      <span className="text-sm font-medium">{cat.nombre}</span>
                    </label>

                    {hasSubs && (
                      <div className="ml-7 mb-1 flex flex-col">
                        {cat.subcategorias.map((sub, si) => (
                          <div key={si} className="flex items-center gap-3 py-1.5">
                            <input
                              type="checkbox"
                              id={sk(idx, si)}
                              checked={!!checked[sk(idx, si)]}
                              onChange={() => toggleSub(idx, si)}
                              className="h-4 w-4 rounded shrink-0"
                            />
                            {sub.personalizable && !!checked[sk(idx, si)] ? (
                              <Input
                                value={nombres[sk(idx, si)] ?? ""}
                                onChange={e => setNombres(prev => ({ ...prev, [sk(idx, si)]: e.target.value }))}
                                className="h-6 text-sm py-0 w-36"
                                placeholder={sub.nombre}
                              />
                            ) : (
                              <label
                                htmlFor={sk(idx, si)}
                                className="text-sm text-muted-foreground cursor-pointer"
                              >
                                {sub.nombre}
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleImportar} disabled={!hasSelection || loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Importar
              </Button>
            </div>
          </>
        )}

        {step === "conflicts" && (
          <>
            <div className="px-6 pb-3 shrink-0">
              <p className="text-sm text-muted-foreground">
                Las siguientes ya existen. Elegí qué hacer con cada una:
              </p>
            </div>
            <div className="overflow-y-auto flex-1 mx-6 flex flex-col divide-y divide-border border border-border rounded-lg min-h-0">
              {conflictRows.map((row, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
                  <span className="text-sm font-medium truncate">{row.label}</span>
                  <div className="flex gap-1 shrink-0">
                    {(["saltar", "reemplazar", "crear_duplicado"] as Estrategia[]).map(est => (
                      <button
                        key={est}
                        onClick={() => setConflictRows(prev =>
                          prev.map((r, j) => j === i ? { ...r, estrategia: est } : r)
                        )}
                        className={cn(
                          "text-xs px-2 py-1 rounded border transition-colors whitespace-nowrap",
                          row.estrategia === est
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                        )}
                      >
                        {est === "saltar" ? "Saltar" : est === "reemplazar" ? "Reemplazar" : "Duplicar"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
              <Button variant="ghost" onClick={() => setStep("select")}>Volver</Button>
              <Button onClick={handleConfirmar} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Confirmar e importar
              </Button>
            </div>
          </>
        )}

        {step === "done" && results && (
          <div className="flex flex-col items-center gap-4 px-6 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="font-semibold text-lg">¡Listo!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {results.creadas} creada{results.creadas !== 1 ? "s" : ""}
                {results.saltadas > 0 && `, ${results.saltadas} saltada${results.saltadas !== 1 ? "s" : ""}`}
                {results.reemplazadas > 0 && `, ${results.reemplazadas} reemplazada${results.reemplazadas !== 1 ? "s" : ""}`}
              </p>
              {results.errores.length > 0 && (
                <div className="mt-3 text-xs text-destructive text-left space-y-1">
                  {results.errores.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
            </div>
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
