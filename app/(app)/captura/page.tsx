import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CapturaFormPage } from "./_components/captura-form-page";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";
import type { Persona } from "@/types/supabase";

export default async function CapturaPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [cuentasRes, tarjetasRes, categoriasRes, clientesRes, personasRes, gruposRes] = await Promise.all([
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
    miembros: (g.grupo_miembros as { persona_id: string; personas: Persona | null }[])
      .map((m) => m.personas)
      .filter((p): p is Persona => p !== null),
  }));

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] px-4 py-8 max-w-xl mx-auto w-full">
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold">¿Qué cargamos?</h1>
        <p className="text-muted-foreground mt-2">
          Contame tus movimientos y nos ordenamos.
        </p>
      </div>

      <CapturaFormPage
        cuentas={cuentasRes.data ?? []}
        tarjetas={tarjetasRes.data ?? []}
        categorias={categoriasRes.data ?? []}
        clientes={(clientesRes.data ?? []) as { id: string; nombre: string }[]}
        personas={(personasRes.data ?? []) as Persona[]}
        grupos={grupos}
      />
    </div>
  );
}
