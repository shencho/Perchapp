"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CapturaForm } from "@/components/captura/captura-form";
import { Skeleton } from "@/components/ui/skeleton";
import type { Cuenta, Tarjeta, Categoria, Persona } from "@/types/supabase";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";

export type CapturaData = {
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  clientes: { id: string; nombre: string }[];
  personas: Persona[];
  grupos: GrupoConMiembros[];
};

interface Props {
  onSuccess?: () => void;
  cachedData: CapturaData | null;
  onDataFetched: (d: CapturaData) => void;
}

export function CapturaSheetContent({ onSuccess, cachedData, onDataFetched }: Props) {
  const [data, setData] = useState<CapturaData | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(false);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("no user");

      const [cuentasRes, tarjetasRes, categoriasRes, clientesRes, personasRes, gruposRes] =
        await Promise.all([
          supabase
            .from("cuentas")
            .select("*")
            .eq("user_id", user.id)
            .eq("archivada", false)
            .order("orden"),
          supabase
            .from("tarjetas")
            .select("*")
            .eq("user_id", user.id)
            .eq("archivada", false),
          supabase
            .from("categorias")
            .select("*")
            .eq("user_id", user.id)
            .eq("archivada", false)
            .order("nombre"),
          supabase
            .from("clientes")
            .select("id, nombre")
            .eq("user_id", user.id)
            .eq("archivado", false)
            .order("nombre"),
          supabase
            .from("personas")
            .select("*")
            .eq("user_id", user.id)
            .eq("archivado", false)
            .order("nombre"),
          supabase
            .from("grupos")
            .select("*, grupo_miembros(persona_id, personas(*))")
            .eq("user_id", user.id)
            .eq("archivado", false)
            .order("nombre"),
        ]);

      const grupos: GrupoConMiembros[] = (gruposRes.data ?? []).map((g) => ({
        ...g,
        miembros: (
          g.grupo_miembros as { persona_id: string; personas: Persona | null }[]
        )
          .map((m) => m.personas)
          .filter((p): p is Persona => p !== null),
      }));

      const fetched: CapturaData = {
        cuentas: cuentasRes.data ?? [],
        tarjetas: tarjetasRes.data ?? [],
        categorias: categoriasRes.data ?? [],
        clientes: (clientesRes.data ?? []) as { id: string; nombre: string }[],
        personas: (personasRes.data ?? []) as Persona[],
        grupos,
      };

      setData(fetched);
      onDataFetched(fetched);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!cachedData) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <p>No se pudo cargar el formulario.</p>
        <button
          onClick={fetchData}
          className="text-primary underline underline-offset-2"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <CapturaForm
        variant="sheet"
        onSuccess={onSuccess}
        cuentas={data.cuentas}
        tarjetas={data.tarjetas}
        categorias={data.categorias}
        clientes={data.clientes}
        personas={data.personas}
        grupos={data.grupos}
      />
    </div>
  );
}
