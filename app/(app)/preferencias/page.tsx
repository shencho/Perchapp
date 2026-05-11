import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PreferenciasPageContent } from "@/components/preferencias/preferencias-page-content";

export default async function PreferenciasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return <PreferenciasPageContent profile={profile} />;
}
