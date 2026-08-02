import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBugReports } from "@/lib/supabase/actions/bug-reports";
import { ControlClient } from "./_components/control-client";

export default async function ControlPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("es_admin")
    .eq("id", user.id)
    .single();

  if (!perfil?.es_admin) notFound();

  const bugs = await getBugReports().catch(() => []);
  return <ControlClient bugs={bugs} />;
}
