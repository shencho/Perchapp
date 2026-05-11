import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PerfilPageContent } from "@/components/perfil/perfil-page-content";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: profesiones }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("profesiones_templates").select("nombre, slug").order("nombre"),
  ]);

  return (
    <PerfilPageContent
      profile={profile}
      profesiones={profesiones ?? []}
    />
  );
}
