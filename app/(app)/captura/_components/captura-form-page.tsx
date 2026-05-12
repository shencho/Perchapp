"use client";

import { useRouter } from "next/navigation";
import { CapturaForm } from "@/components/captura/captura-form";
import type { Cuenta, Tarjeta, Categoria, Persona } from "@/types/supabase";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";

interface Props {
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  clientes: { id: string; nombre: string }[];
  personas: Persona[];
  grupos: GrupoConMiembros[];
}

export function CapturaFormPage({ cuentas, tarjetas, categorias, clientes, personas, grupos }: Props) {
  const router = useRouter();
  return (
    <CapturaForm
      onSuccess={() => router.push("/movimientos")}
      variant="page"
      cuentas={cuentas}
      tarjetas={tarjetas}
      categorias={categorias}
      clientes={clientes}
      personas={personas}
      grupos={grupos}
    />
  );
}
