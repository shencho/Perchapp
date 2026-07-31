import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProyecto } from "@/lib/supabase/actions/proyectos";
import { ProyectoDetailClient } from "./_components/proyecto-detail-client";
import type { Persona } from "@/types/supabase";

export default async function ProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const detalle = await getProyecto(id);
  if (!detalle) notFound();

  const [{ data: cuentasRaw }, { data: personasRaw }] = await Promise.all([
    supabase.from("cuentas").select("id, nombre").eq("user_id", user.id).eq("archivada", false).order("orden"),
    supabase
      .from("personas")
      .select("*")
      .eq("user_id", user.id)
      .eq("archivado", false)
      .not("usuario_vinculado_id", "is", null)
      .order("nombre"),
  ]);

  return (
    <ProyectoDetailClient
      detalle={detalle}
      cuentas={(cuentasRaw ?? []) as { id: string; nombre: string }[]}
      personasConectadas={(personasRaw ?? []) as Persona[]}
    />
  );
}
