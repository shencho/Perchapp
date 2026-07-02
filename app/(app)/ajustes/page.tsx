import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AjustesPageContent } from "@/components/ajustes/ajustes-page-content";

export default async function AjustesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return <AjustesPageContent profile={profile} />;
}
