"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus, X as XIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategoriaInline } from "@/lib/supabase/actions/categorias";

const CREATE_SENTINEL = "__create_new__";

export interface CatOption { id: string; nombre: string; }

interface Props {
  options: CatOption[];
  value: string | null | undefined;
  onValueChange: (id: string) => void;
  onCreated?: (option: CatOption) => void;
  tipo: "Ingreso" | "Egreso";
  parent_id?: string | null;
  placeholder?: string;
  disabled?: boolean;
  suggestCreate?: string;
}

export function CreatableSelect({
  options,
  value,
  onValueChange,
  onCreated,
  tipo,
  parent_id,
  placeholder = "Seleccionar…",
  disabled,
  suggestCreate,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const shouldSuggest =
    suggestCreate &&
    !value &&
    !options.find((o) => o.nombre.toLowerCase() === suggestCreate.toLowerCase());

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  async function handleCreate() {
    const nombre = inputVal.trim();
    if (!nombre) { cancelCreate(); return; }
    setIsLoading(true);
    try {
      const result = await createCategoriaInline({ nombre, tipo, parent_id: parent_id ?? null });
      const opt = { id: result.id, nombre };
      onValueChange(result.id);
      onCreated?.(opt);
      setCreating(false);
      setInputVal("");
    } catch {
      // leave input open so user can retry
    } finally {
      setIsLoading(false);
    }
  }

  function cancelCreate() {
    setCreating(false);
    setInputVal("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
    if (e.key === "Escape") cancelCreate();
  }

  if (creating) {
    return (
      <div className="flex gap-1.5">
        <Input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nombre de categoría…"
          disabled={isLoading}
          className="flex-1 h-9 text-sm"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={handleCreate}
          disabled={isLoading || !inputVal.trim()}
        >
          <Check className="h-3.5 w-3.5 text-green-400" />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" onClick={cancelCreate}>
          <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Select
        value={value ?? ""}
        onValueChange={(v) => {
          if (!v) return;
          if (v === CREATE_SENTINEL) {
            setInputVal(suggestCreate ?? "");
            setCreating(true);
          } else {
            onValueChange(v);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
          ))}
          <SelectItem value={CREATE_SENTINEL} className="text-primary">
            <span className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Crear nueva…
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {shouldSuggest && (
        <button
          type="button"
          onClick={() => { setInputVal(suggestCreate!); setCreating(true); }}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Crear: &quot;{suggestCreate}&quot;
        </button>
      )}
    </div>
  );
}
